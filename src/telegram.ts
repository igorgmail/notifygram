import { TelegramApiError, TelegramNetworkError } from "./errors.js";
import type { InputRichMessage } from "./types/telegram.js";
import type {
  GetUpdatesParams,
  SendMessageResult,
  TelegramResponse,
  TelegramUpdate,
  TelegramUser,
} from "./types/telegram.js";

const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns true if the error is a transient network failure (fetch, undici, timeout, DNS, etc.)
 * where retrying the request makes sense.
 */
function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === "fetch failed") {
    return true;
  }

  const cause = error.cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    const code = String((cause as { code: unknown }).code);
    return (
      code.startsWith("UND_ERR_") ||
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND" ||
      code === "ETIMEDOUT" ||
      code === "ECONNRESET"
    );
  }

  return false;
}

export type ParseMode = "HTML" | "MarkdownV2";
export interface SendMessageParams {
  chatId: number;
  text: string;
  parseMode: ParseMode;
}

export interface SendRichMessageParams {
  chatId: number;
  richMessage: InputRichMessage;
}

export class TelegramApi {
  private readonly baseUrl: string;

  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  /** Sends a message to a chat. */
  async sendMessage(params: SendMessageParams): Promise<TelegramResponse<SendMessageResult>> {
    return this.requestWithRetry("sendMessage", {
      chat_id: params.chatId,
      text: params.text,
      parse_mode: params.parseMode,
    });
  }

  /** Sends a rich message to a chat. */
  async sendRichMessage(
    params: SendRichMessageParams
  ): Promise<TelegramResponse<SendMessageResult>> {
    return this.requestWithRetry("sendRichMessage", {
      chat_id: params.chatId,
      rich_message: params.richMessage,
    });
  }

  /**
   * Use this method to get current bot information.
   * @returns The current bot information.
   */
  async getMe(): Promise<TelegramResponse<TelegramUser>> {
    return this.requestGetUrl<TelegramUser>(`${this.baseUrl}/getMe`);
  }

  async getUpdates(
    params: GetUpdatesParams = {}
  ): Promise<TelegramResponse<TelegramUpdate[]>> {
    const searchParams = new URLSearchParams();
    if (params.offset !== undefined) {
      searchParams.set("offset", String(params.offset));
    }
    if (params.limit !== undefined) {
      searchParams.set("limit", String(params.limit));
    }
    if (params.timeout !== undefined) {
      searchParams.set("timeout", String(params.timeout));
    }

    const query = searchParams.toString();
    const url = query
      ? `${this.baseUrl}/getUpdates?${query}`
      : `${this.baseUrl}/getUpdates`;

    return this.requestGetUrl(url);
  }

  /**
   * Performs a POST request to the Telegram Bot API with a JSON body.
   * On network failures and HTTP 429, retries with exponential backoff
   * (up to {@link MAX_RETRIES} attempts).
   */
  private async requestWithRetry<T>(
    method: string,
    payload: Record<string, unknown>,
    attempt = 0
  ): Promise<TelegramResponse<T>> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return this.retryOnNetworkError(
        () => this.requestWithRetry(method, payload, attempt + 1),
        attempt,
        error
      );
    }

    const data = await this.parseJsonResponse<T>(res);

    if (this.isRateLimited(res, data)) {
      return this.retryAfterDelay(
        () => this.requestWithRetry(method, payload, attempt + 1),
        attempt,
        res,
        data
      );
    }

    this.assertOkResponse(res, data);
    return data;
  }

  /**
   * Handles a fetch failure: on a transient network error waits with exponential
   * backoff and retries via the callback; otherwise throws TelegramNetworkError.
   * At most {@link MAX_RETRIES} attempts.
   */
  private async retryOnNetworkError<T>(
    retry: () => Promise<T>,
    attempt: number,
    error: unknown
  ): Promise<T> {
    if (!isTransientNetworkError(error) || attempt >= MAX_RETRIES) {
      const message =
        error instanceof Error ? error.message : "Network request failed";
      throw new TelegramNetworkError(message, error);
    }

    await sleep(2 ** attempt * 1000);
    return retry();
  }

  /**
   * Handles a 429 (rate limit) response: waits for retry_after from Telegram API
   * parameters and retries; throws TelegramApiError when attempts are exhausted.
   * At most {@link MAX_RETRIES} attempts.
   */
  private async retryAfterDelay<T>(
    retry: () => Promise<TelegramResponse<T>>,
    attempt: number,
    res: Response,
    data: TelegramResponse<T>
  ): Promise<TelegramResponse<T>> {
    if (attempt >= MAX_RETRIES) {
      throw this.createApiError(
        data.description ?? "Rate limited",
        res.status === 429 ? res.status : 429,
        data
      );
    }

    const retryAfter = data.parameters?.retry_after ?? 1;
    await sleep(retryAfter * 1000);
    return retry();
  }

  /**
   * Performs a GET request to a ready-made URL (e.g. getUpdates with query params).
   * On network failures and HTTP 429, retries with exponential backoff
   * (up to {@link MAX_RETRIES} attempts).
   */
  private async requestGetUrl<T>(
    url: string,
    attempt = 0
  ): Promise<TelegramResponse<T>> {
    let res: Response;
    try {
      res = await fetch(url, { method: "GET" });
    } catch (error) {
      return this.retryOnNetworkError(
        () => this.requestGetUrl(url, attempt + 1),
        attempt,
        error
      );
    }

    const data = await this.parseJsonResponse<T>(res);

    if (this.isRateLimited(res, data)) {
      return this.retryAfterDelay(
        () => this.requestGetUrl(url, attempt + 1),
        attempt,
        res,
        data
      );
    }

    this.assertOkResponse(res, data);
    return data;
  }

  /**
   * Reads the HTTP response body as JSON and casts it to the Telegram Bot API format.
   */
  private async parseJsonResponse<T>(res: Response): Promise<TelegramResponse<T>> {
    return (await res.json()) as TelegramResponse<T>;
  }

  /**
   * Returns true if the response indicates rate limiting (HTTP 429
   * or error_code 429 in the Telegram API body).
   */
  private isRateLimited(
    res: Response,
    data: TelegramResponse<unknown>
  ): boolean {
    return res.status === 429 || (!data.ok && data.error_code === 429);
  }

  /**
   * Asserts that the HTTP response and the Telegram API `ok` field are successful;
   * throws TelegramApiError on failure, otherwise narrows data to ok: true.
   */
  private assertOkResponse(
    res: Response,
    data: TelegramResponse<unknown>
  ): asserts data is TelegramResponse<unknown> & { ok: true } {
    if (!res.ok) {
      throw this.createApiError(
        data.description ?? `HTTP ${res.status}`,
        res.status,
        data
      );
    }

    if (!data.ok) {
      throw this.createApiError(
        data.description ?? "Telegram API request failed",
        res.status,
        data
      );
    }
  }

  /**
   * Creates a TelegramApiError from the error message, HTTP status, and
   * error_code / parameters fields from the Telegram API response.
   */
  private createApiError(
    message: string,
    httpStatus: number,
    data: TelegramResponse<unknown>
  ): TelegramApiError {
    return new TelegramApiError(
      message,
      httpStatus,
      data.error_code,
      data.parameters
    );
  }
}
