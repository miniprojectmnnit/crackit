/**
 * Structured Logger Utility for CrackIt Server
 * 
 * Provides colored, timestamped, tagged log output.
 * Zero external dependencies — uses only Node.js built-ins.
 */

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

/**
 * Get a formatted timestamp string [HH:MM:SS]
 */
function getTimestamp() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Pad or truncate a tag to a fixed width for alignment.
 */
function formatTag(tag) {
  return tag.padEnd(10);
}

/**
 * Core log function.
 * @param {'info'|'success'|'warn'|'error'|'debug'} level
 * @param {string} tag - Module tag, e.g. 'EXTRACT', 'LLM', 'DB'
 * @param {string} message - Log message
 * @param {object} [data] - Optional data to log
 */
function log(level, tag, message, data) {
  const timestamp = getTimestamp();
  const formattedTag = formatTag(tag);

  let color, icon;
  switch (level) {
    case 'success':
      color = COLORS.green;
      icon = '✅';
      break;
    case 'warn':
      color = COLORS.yellow;
      icon = '⚠️';
      break;
    case 'error':
      color = COLORS.red;
      icon = '❌';
      break;
    case 'debug':
      color = COLORS.gray;
      icon = '🔍';
      break;
    case 'info':
    default:
      color = COLORS.cyan;
      icon = '📋';
      break;
  }

  const prefix = `${COLORS.dim}[${timestamp}]${COLORS.reset} ${color}[${formattedTag}]${COLORS.reset} ${icon}`;
  const fullMessage = `${prefix} ${message}`;

  if (level === 'error') {
    console.error(fullMessage);
    if (data) console.error(data);
  } else if (level === 'warn') {
    console.warn(fullMessage);
    if (data) console.warn(data);
  } else {
    console.log(fullMessage);
    if (data) console.log(data);
  }
}

// Public API — each method takes (tag, message, optionalData)
const logger = {
  info: (tag, message, data) => log('info', tag, message, data),
  success: (tag, message, data) => log('success', tag, message, data),
  warn: (tag, message, data) => log('warn', tag, message, data),
  error: (tag, message, data) => log('error', tag, message, data),
  debug: (tag, message, data) => log('debug', tag, message, data),
};

module.exports = logger;
