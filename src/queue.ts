/** Асинхронная операция отправки, которую нужно выполнить через очередь. */
export type SendOperation = () => Promise<unknown>;

/** Элемент очереди: операция отправки и callback для сигнализации о завершении. */
interface QueueItem {
  send: SendOperation;
  resolve: () => void;
}

/** Минимальный интервал между операциями отправки в Telegram (мс). */
const MIN_INTERVAL_MS = 1000;

/**
 * Очередь исходящих операций Telegram.
 * Выполняет операции последовательно с соблюдением rate limit.
 */
export class MessageQueue {
  /** Буфер операций, ожидающих отправки. */
  private readonly queue: QueueItem[] = [];
  /** Флаг: идёт ли сейчас цикл отправки. */
  private processing = false;
  /** Время последней успешной отправки (для расчёта паузы). */
  private lastSendTime = 0;
  /** Общий Promise ожидания опустошения очереди; переиспользуется при параллельных flush(). */
  private pendingFlush: Promise<void> | null = null;

  /**
   * Добавляет операцию отправки в очередь и возвращает Promise,
   * который разрешится после выполнения операции (или при ошибке отправки).
   */
  enqueue(send: SendOperation): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ send, resolve });
      void this.processQueue();
    });
  }

  /**
   * Ждёт, пока очередь полностью обработается.
   * Параллельные вызовы flush() получают один и тот же Promise.
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0 && !this.processing) {
      return;
    }

    if (!this.pendingFlush) {
      this.pendingFlush = this.waitUntilEmpty().finally(() => {
        this.pendingFlush = null;
      });
    }

    return this.pendingFlush;
  }

  /** Ожидает завершения обработки и опустошения очереди (опрос каждые 50 мс). */
  private async waitUntilEmpty(): Promise<void> {
    while (this.processing || this.queue.length > 0) {
      await sleep(50);
    }
  }

  /**
   * Обрабатывает очередь: выполняет операции по одной,
   * выдерживая MIN_INTERVAL_MS между отправками.
   * При ошибке логирует в stderr и продолжает работу, не прерывая хост-приложение.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) {
          break;
        }

        const elapsed = Date.now() - this.lastSendTime;
        if (elapsed < MIN_INTERVAL_MS) {
          await sleep(MIN_INTERVAL_MS - elapsed);
        }

        try {
          await item.send();
          this.lastSendTime = Date.now();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          process.stderr.write(
            `[notifygram] Failed to send message: ${message}\n`
          );
          // Logging must not crash the host application.
        } finally {
          item.resolve();
        }
      }
    } finally {
      this.processing = false;

      if (this.queue.length > 0) {
        void this.processQueue();
      }
    }
  }
}

/** Возвращает Promise, который разрешится через указанное число миллисекунд. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
