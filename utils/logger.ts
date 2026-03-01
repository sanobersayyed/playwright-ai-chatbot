/**
 * logger.ts
 * Timestamped, levelled logger for Playwright test runs.
 * Writes to stdout AND appends to logs/test-run.log.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.info('Test started');
 *   logger.warn('Selector not found – using fallback');
 *   logger.error('Unexpected empty response');
 */

import * as fs   from 'fs';
import * as path from 'path';

const LOG_DIR  = path.resolve('logs');
const LOG_FILE = path.join(LOG_DIR, 'test-run.log');

// Ensure the log directory exists once at module load – not on every write.
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  // Non-fatal – logging will fall back to console-only if the dir cannot be created.
}

const LEVELS = {
  INFO:  'INFO ',
  WARN:  'WARN ',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
} as const;

type LogLevel = (typeof LEVELS)[keyof typeof LEVELS];

function log(level: LogLevel, message: string): void {
  const entry = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(entry);
  try {
    fs.appendFileSync(LOG_FILE, entry + '\n', 'utf-8');
  } catch {
    // Non-fatal – continue if the file write fails.
  }
}

const logger = {
  info:  (msg: string): void => log(LEVELS.INFO,  msg),
  warn:  (msg: string): void => log(LEVELS.WARN,  msg),
  error: (msg: string): void => log(LEVELS.ERROR, msg),
  debug: (msg: string): void => log(LEVELS.DEBUG, msg),

  /** Truncate the log file – useful at the start of a fresh test run. */
  clearLog(): void {
    try { fs.writeFileSync(LOG_FILE, '', 'utf-8'); } catch { /* ignore */ }
  },
};

export default logger;
