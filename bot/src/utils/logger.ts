/* eslint-disable no-console */

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
} as const;

type Level = 'debug' | 'info' | 'warn' | 'error' | 'success';

const LEVEL_STYLE: Record<Level, { color: string; label: string }> = {
  debug: { color: COLORS.dim, label: 'DEBUG' },
  info: { color: COLORS.cyan, label: 'INFO ' },
  warn: { color: COLORS.yellow, label: 'WARN ' },
  error: { color: COLORS.red, label: 'ERROR' },
  success: { color: COLORS.green, label: 'OK   ' },
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function write(level: Level, scope: string, message: unknown, ...rest: unknown[]): void {
  const style = LEVEL_STYLE[level];
  const prefix = `${COLORS.dim}${timestamp()}${COLORS.reset} ${style.color}${style.label}${COLORS.reset} ${COLORS.magenta}[${scope}]${COLORS.reset}`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(prefix, message, ...rest);
}

/**
 * Logger minimale con scope, così ogni modulo dichiara da dove arriva la riga.
 * Uso: `const log = createLogger('bot'); log.info('pronto');`
 */
export function createLogger(scope: string) {
  return {
    debug: (message: unknown, ...rest: unknown[]) => write('debug', scope, message, ...rest),
    info: (message: unknown, ...rest: unknown[]) => write('info', scope, message, ...rest),
    warn: (message: unknown, ...rest: unknown[]) => write('warn', scope, message, ...rest),
    error: (message: unknown, ...rest: unknown[]) => write('error', scope, message, ...rest),
    success: (message: unknown, ...rest: unknown[]) => write('success', scope, message, ...rest),
  };
}

export type Logger = ReturnType<typeof createLogger>;
