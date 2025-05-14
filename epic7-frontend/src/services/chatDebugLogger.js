/**
 * Chat Debug Logger
 * 
 * Enhanced logging for debugging WebSocket and Chat issues
 * Centralizes all chat-related debug logs with structured information
 */

// Configuration 
const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_LEVEL = DEBUG_MODE ? 'debug' : 'warn';
const PERSIST_LOGS = false; // Set to true to keep logs in localStorage

/**
 * Log levels
 */
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Should we log at the given level?
 */
function shouldLog(level) {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

/**
 * Generate a timestamp for logging
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Format additional data for logging
 * @param {Object} data - Additional data to include in log
 */
function formatData(data) {
  if (!data) return '';
  
  try {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `[Cannot stringify data: ${e.message}]`;
  }
}

/**
 * Core logging function
 */
function log(level, context, message, data) {
  if (!shouldLog(level)) return;
  
  const ts = timestamp();
  const formattedData = formatData(data);
  
  // Prepare the log entry
  const entry = {
    timestamp: ts,
    level,
    context,
    message,
    data: formattedData
  };
  
  // Format console output
  const consoleMessage = `[${ts}] [${level.toUpperCase()}] [${context}] ${message}`;
  
  // Output to console with appropriate level
  switch (level) {
    case 'error':
      console.error(consoleMessage, data);
      break;
    case 'warn':
      console.warn(consoleMessage, data);
      break;
    case 'info':
      console.info(consoleMessage, data);
      break;
    default:
      console.log(consoleMessage, data);
  }
  
  // Persist logs if enabled
  if (PERSIST_LOGS) {
    try {
      // Get existing logs
      const existingLogs = JSON.parse(localStorage.getItem('chat_debug_logs') || '[]');
      
      // Add new log
      existingLogs.push(entry);
      
      // Limit log size (keep last 100 entries)
      if (existingLogs.length > 100) {
        existingLogs.shift();
      }
      
      // Save back to localStorage
      localStorage.setItem('chat_debug_logs', JSON.stringify(existingLogs));
    } catch (e) {
      console.error('Failed to persist log:', e);
    }
  }
  
  return entry;
}

/**
 * Log a WebSocket connection event
 */
export function logConnection(state, details = null) {
  return log('info', 'WS_CONNECTION', `WebSocket connection state: ${state}`, details);
}

/**
 * Log a chat room event
 */
export function logRoomEvent(roomType, roomId, action, details = null) {
  return log('info', 'CHAT_ROOM', `Room ${roomType}/${roomId}: ${action}`, details);
}

/**
 * Log a message event
 */
export function logMessageEvent(roomId, action, messageId = null, details = null) {
  const context = messageId ? `MSG_${messageId}` : 'MESSAGES';
  return log('debug', context, `Message in room ${roomId}: ${action}`, details);
}

/**
 * Log a recovery attempt for debugging
 */
export function logRecoveryAttempt(roomKey, attempt, maxAttempts, details = null) {
  return log('warn', 'RECOVERY', `Recovery attempt ${attempt}/${maxAttempts} for room ${roomKey}`, details);
}

/**
 * Log a circuit breaker event
 */
export function logCircuitBreaker(roomKey, state, reason = null, details = null) {
  const data = details || {};
  data.reason = reason;
  
  return log('error', 'CIRCUIT_BREAKER', `Circuit breaker ${state} for room ${roomKey}`, data);
}

/**
 * Log an error
 */
export function logError(context, message, error = null) {
  return log('error', context, message, error);
}

/**
 * Export debug logs as JSON
 */
export function exportLogs() {
  try {
    const logs = localStorage.getItem('chat_debug_logs') || '[]';
    return logs;
  } catch (e) {
    console.error('Failed to export logs:', e);
    return '[]';
  }
}

/**
 * Clear persisted logs
 */
export function clearLogs() {
  try {
    localStorage.removeItem('chat_debug_logs');
    return true;
  } catch (e) {
    console.error('Failed to clear logs:', e);
    return false;
  }
}

export default {
  logConnection,
  logRoomEvent,
  logMessageEvent,
  logRecoveryAttempt,
  logCircuitBreaker,
  logError,
  exportLogs,
  clearLogs
};
