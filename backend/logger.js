/**
 * logger.js — Capture des erreurs backend en mémoire circulaire
 * Accessible via /api/logs
 */

const MAX_LOGS = 200; // Garder les 200 derniers logs
const _logs = [];

const LEVELS = { error: 'error', warn: 'warn', info: 'info' };

function addLog(level, message, source) {
  _logs.push({
    ts:      new Date().toISOString(),
    level,
    message: String(message).slice(0, 1000), // Limiter la taille
    source:  source || 'backend',
  });
  if (_logs.length > MAX_LOGS) _logs.shift(); // Supprimer le plus ancien
}

// Intercepter console.error et console.warn
const _origError = console.error.bind(console);
const _origWarn  = console.warn.bind(console);

console.error = function(...args) {
  _origError(...args);
  addLog('error', args.map(function(a){ return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '));
};

console.warn = function(...args) {
  _origWarn(...args);
  addLog('warn', args.map(function(a){ return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '));
};

// Capturer les erreurs non gérées
process.on('uncaughtException', function(err) {
  addLog('error', 'uncaughtException: ' + err.message + '\n' + err.stack, 'process');
});

process.on('unhandledRejection', function(reason) {
  addLog('error', 'unhandledRejection: ' + String(reason), 'process');
});

function getLogs(level, limit) {
  let logs = _logs.slice();
  if (level) logs = logs.filter(function(l){ return l.level === level; });
  return logs.slice(-(limit || 100)).reverse(); // Plus récents en premier
}

function clearLogs() {
  _logs.length = 0;
}

module.exports = { addLog, getLogs, clearLogs, LEVELS };
