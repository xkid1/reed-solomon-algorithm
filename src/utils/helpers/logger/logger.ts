export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const COLORS: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: '\x1b[90m', // gray
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && value in LEVEL_WEIGHT;
}

/**
 * Simple leveled console logger.
 *
 * - Always on by default (level "info"), no DEBUG env var needed.
 * - Level is read lazily from `Logger.setLevel()` or `process.env.LOG_LEVEL`,
 *   so it works even if `.env` is loaded after this module is imported.
 * - Set `LOG_LEVEL=debug` to see debug logs, `LOG_LEVEL=silent` to mute all.
 *
 * Usage:
 *   const logger = new Logger('app');
 *   logger.info('Server started on port', 3000);
 *   logger.error('Failed to connect:', error);
 *
 *   const dbLogger = logger.child('db');   // namespace "app:db"
 */
class Logger {
  private static levelOverride: LogLevel | null = null;

  private readonly namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /** Set the global level at runtime (takes priority over LOG_LEVEL). */
  static setLevel(level: LogLevel): void {
    Logger.levelOverride = level;
  }

  /** Current effective level: setLevel() > LOG_LEVEL env > "info". */
  static getLevel(): LogLevel {
    if (Logger.levelOverride) return Logger.levelOverride;

    const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
    return isLogLevel(fromEnv) ? fromEnv : 'info';
  }

  /** Create a logger with a sub-namespace, e.g. "app" -> "app:db". */
  child(subNamespace: string): Logger {
    return new Logger(`${this.namespace}:${subNamespace}`);
  }

  debug(message: unknown, ...args: unknown[]): void {
    this.write('debug', message, args);
  }

  /** Alias of info(), kept for backward compatibility. */
  log(message: unknown, ...args: unknown[]): void {
    this.write('info', message, args);
  }

  info(message: unknown, ...args: unknown[]): void {
    this.write('info', message, args);
  }

  warn(message: unknown, ...args: unknown[]): void {
    this.write('warn', message, args);
  }

  error(message: unknown, ...args: unknown[]): void {
    this.write('error', message, args);
  }

  private write(
    level: Exclude<LogLevel, 'silent'>,
    message: unknown,
    args: unknown[],
  ): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[Logger.getLevel()]) return;

    const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
    const time = new Date().toISOString();
    const tag = level.toUpperCase().padEnd(5);
    const prefix = useColor
      ? `${COLORS[level]}${time} ${tag}${RESET} [${this.namespace}]`
      : `${time} ${tag} [${this.namespace}]`;

    // console.* prints Error objects with their stack trace automatically.
    switch (level) {
      case 'error':
        console.error(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.log(prefix, message, ...args);
        break;
    }
  }
}

export default Logger;
