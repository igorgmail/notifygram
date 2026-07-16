/** Async send operation to be executed through the queue. */
export type SendOperation = () => Promise<unknown>;

/** Queue item: a send operation and a callback signaling completion. */
interface QueueItem {
  send: SendOperation;
  resolve: () => void;
}

/** Minimum interval between Telegram send operations (ms). */
const MIN_INTERVAL_MS = 1000;

/**
 * Queue of outgoing Telegram operations.
 * Executes operations sequentially while respecting the rate limit.
 */
export class MessageQueue {
  /** Buffer of operations waiting to be sent. */
  private readonly queue: QueueItem[] = [];
  /** Whether the send loop is currently running. */
  private processing = false;
  /** Timestamp of the last successful send (used to compute the pause). */
  private lastSendTime = 0;
  /** Shared promise waiting for the queue to drain; reused across parallel flush() calls. */
  private pendingFlush: Promise<void> | null = null;

  /**
   * Enqueues a send operation and returns a Promise
   * that resolves after the operation completes (or after a send error).
   */
  enqueue(send: SendOperation): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ send, resolve });
      void this.processQueue();
    });
  }

  /**
   * Waits until the queue is fully processed.
   * Parallel flush() calls share the same Promise.
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

  /** Waits until processing finishes and the queue is empty (polls every 50 ms). */
  private async waitUntilEmpty(): Promise<void> {
    while (this.processing || this.queue.length > 0) {
      await sleep(50);
    }
  }

  /**
   * Processes the queue: runs operations one by one,
   * keeping MIN_INTERVAL_MS between sends.
   * On error, logs to stderr and continues without crashing the host app.
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
            `[notifygram] Failed to send operation: ${message}\n`
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

/** Returns a Promise that resolves after the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
