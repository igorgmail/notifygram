/** Reads environment values without depending on the filesystem. */
export interface EnvironmentSource {
  /** Returns the value for `key`, or `undefined` when missing. */
  get(key: string): string | undefined;
}

/**
 * Default env source: `process.env` when available (Node / SSR).
 * Safe in browsers where `process` is undefined.
 * Does not load `.env` files from disk.
 */
export class ProcessEnvironmentSource implements EnvironmentSource {
  get(key: string): string | undefined {
    if (typeof process === "undefined" || process.env == null) {
      return undefined;
    }

    const value = process.env[key];
    return value === undefined ? undefined : value;
  }
}
