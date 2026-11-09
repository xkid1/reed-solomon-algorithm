import { describe, expect, it, vi } from 'vitest';

import Logger from './logger.js';

function setIsTTY(value: boolean): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value });

  return () => {
    if (descriptor === undefined) Reflect.deleteProperty(process.stdout, 'isTTY');
    else Object.defineProperty(process.stdout, 'isTTY', descriptor);
  };
}

describe('Logger', () => {
  it('reads LOG_LEVEL lazily and defaults invalid values to info', () => {
    vi.stubEnv('LOG_LEVEL', '');
    expect(Logger.getLevel()).toBe('info');

    vi.stubEnv('LOG_LEVEL', 'DEBUG');
    expect(Logger.getLevel()).toBe('debug');

    vi.stubEnv('LOG_LEVEL', 'not-a-level');
    expect(Logger.getLevel()).toBe('info');
  });

  it('gives the explicit level override precedence over LOG_LEVEL', () => {
    vi.stubEnv('LOG_LEVEL', 'debug');
    Logger.setLevel('warn');
    expect(Logger.getLevel()).toBe('warn');

    Logger.setLevel('silent');
    expect(Logger.getLevel()).toBe('silent');
    Logger.setLevel('info');
  });

  it('routes each level to its matching console method and supports child namespaces', () => {
    Logger.setLevel('debug');
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => void 0);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new Logger('service');

    logger.debug('debug message', 1);
    logger.log('log message');
    logger.info('info message');
    logger.warn('warning');
    logger.error('failure');
    logger.child('database').info('connected');

    expect(debug).toHaveBeenCalledWith(
      expect.stringMatching(/\[service\]$/),
      'debug message',
      1,
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/\[service\]$/),
      'log message',
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/\[service\]$/),
      'info message',
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/\[service:database\]$/),
      'connected',
    );
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/\[service\]$/), 'warning');
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/\[service\]$/), 'failure');
    Logger.setLevel('info');
  });

  it('filters messages below the configured level', () => {
    Logger.setLevel('warn');
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new Logger('filtered');

    logger.debug('hidden');
    logger.info('hidden');
    logger.log('hidden');
    logger.warn('visible');
    logger.error('visible');

    expect(debug).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    Logger.setLevel('info');
  });

  it('uses ANSI colors only for a TTY when NO_COLOR is unset', () => {
    Logger.setLevel('info');
    vi.stubEnv('NO_COLOR', '');
    const restoreTTY = setIsTTY(true);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      new Logger('colored').info('ready');
    } finally {
      restoreTTY();
    }

    expect(log).toHaveBeenCalledWith(expect.any(String), 'ready');
    expect(log.mock.calls[0]?.[0]).toContain('\u001b[36m');
    expect(log.mock.calls[0]?.[0]).toContain('\u001b[0m [colored]');
  });

  it('disables ANSI colors when NO_COLOR is set', () => {
    Logger.setLevel('info');
    vi.stubEnv('NO_COLOR', '1');
    const restoreTTY = setIsTTY(true);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      new Logger('plain').info('ready');
    } finally {
      restoreTTY();
    }

    expect(log).toHaveBeenCalledWith(expect.stringMatching(/\[plain\]$/), 'ready');
    expect(log.mock.calls[0]?.[0]).not.toContain('\u001b[');
  });
});
