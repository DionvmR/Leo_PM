/**
 * Logger utility for tracking MCP operations and timeout errors
 * Provides timestamped logging with severity levels
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Logger {
  constructor(logFileName = 'mcp-operations.log') {
    this.logFile = path.join(__dirname, '..', 'logs', logFileName);
    this.ensureLogDirectory();
    
    // Log levels
    this.levels = {
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARNING: 'WARNING',
      ERROR: 'ERROR',
      CRITICAL: 'CRITICAL'
    };
    
    // Color codes for console output
    this.colors = {
      DEBUG: '\x1b[36m',    // Cyan
      INFO: '\x1b[32m',     // Green
      WARNING: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m',    // Red
      CRITICAL: '\x1b[35m', // Magenta
      RESET: '\x1b[0m'
    };
  }
  
  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  /**
   * Get formatted timestamp
   */
  getTimestamp() {
    const now = new Date();
    return now.toISOString();
  }
  
  /**
   * Format log entry
   */
  formatLogEntry(level, message, data = null) {
    const entry = {
      timestamp: this.getTimestamp(),
      level: level,
      message: message
    };
    
    if (data) {
      entry.data = data;
    }
    
    return entry;
  }
  
  /**
   * Write to log file
   */
  writeToFile(entry) {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logFile, logLine);
  }
  
  /**
   * Write to console
   */
  writeToConsole(level, message, data) {
    const color = this.colors[level] || this.colors.RESET;
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`${color}[${timestamp}] [${level}]${this.colors.RESET} ${message}`);
    
    if (data) {
      console.log(data);
    }
  }
  
  /**
   * Generic log method
   */
  log(level, message, data = null) {
    const entry = this.formatLogEntry(level, message, data);
    this.writeToFile(entry);
    this.writeToConsole(level, message, data);
  }
  
  // Convenience methods for each level
  debug(message, data = null) {
    this.log(this.levels.DEBUG, message, data);
  }
  
  info(message, data = null) {
    this.log(this.levels.INFO, message, data);
  }
  
  warning(message, data = null) {
    this.log(this.levels.WARNING, message, data);
  }
  
  error(message, data = null) {
    this.log(this.levels.ERROR, message, data);
  }
  
  critical(message, data = null) {
    this.log(this.levels.CRITICAL, message, data);
  }
  
  /**
   * Log MCP operation start
   */
  logMCPOperation(operation, params) {
    this.info(`MCP Operation Started: ${operation}`, {
      operation,
      params,
      startTime: this.getTimestamp()
    });
  }
  
  /**
   * Log MCP operation result
   */
  logMCPResult(operation, duration, success, result = null) {
    const level = success ? this.levels.INFO : this.levels.ERROR;
    const status = success ? 'completed' : 'failed';
    
    this.log(level, `MCP Operation ${status}: ${operation} (${duration}ms)`, {
      operation,
      duration,
      success,
      result: result ? (typeof result === 'object' ? result : { message: result }) : null
    });
  }
  
  /**
   * Log timeout error specifically
   */
  logTimeout(operation, timeout, details = {}) {
    this.error(`TIMEOUT: ${operation} exceeded ${timeout}ms`, {
      operation,
      timeout,
      type: 'TIMEOUT_ERROR',
      ...details
    });
  }
  
  /**
   * Log connection event
   */
  logConnection(server, success, duration, error = null) {
    if (success) {
      this.info(`Connected to ${server} in ${duration}ms`, {
        server,
        duration,
        event: 'CONNECTION_SUCCESS'
      });
    } else {
      this.error(`Failed to connect to ${server} after ${duration}ms`, {
        server,
        duration,
        event: 'CONNECTION_FAILURE',
        error: error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Get log summary for analysis
   */
  async getLogSummary() {
    try {
      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const entries = logContent.trim().split('\n').map(line => JSON.parse(line));
      
      const summary = {
        totalEntries: entries.length,
        byLevel: {},
        timeouts: [],
        errors: [],
        operations: {}
      };
      
      // Count by level
      Object.values(this.levels).forEach(level => {
        summary.byLevel[level] = 0;
      });
      
      entries.forEach(entry => {
        summary.byLevel[entry.level] = (summary.byLevel[entry.level] || 0) + 1;
        
        // Collect timeouts
        if (entry.data && entry.data.type === 'TIMEOUT_ERROR') {
          summary.timeouts.push({
            timestamp: entry.timestamp,
            operation: entry.data.operation,
            timeout: entry.data.timeout
          });
        }
        
        // Collect errors
        if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
          summary.errors.push({
            timestamp: entry.timestamp,
            message: entry.message,
            data: entry.data
          });
        }
        
        // Track operations
        if (entry.data && entry.data.operation) {
          const op = entry.data.operation;
          if (!summary.operations[op]) {
            summary.operations[op] = {
              total: 0,
              success: 0,
              failed: 0,
              timeouts: 0
            };
          }
          
          summary.operations[op].total++;
          
          if (entry.data.success === true) {
            summary.operations[op].success++;
          } else if (entry.data.success === false) {
            summary.operations[op].failed++;
          }
          
          if (entry.data.type === 'TIMEOUT_ERROR') {
            summary.operations[op].timeouts++;
          }
        }
      });
      
      return summary;
    } catch (error) {
      this.error('Failed to generate log summary', { error: error.message });
      return null;
    }
  }
  
  /**
   * Clear log file
   */
  clearLogs() {
    try {
      fs.writeFileSync(this.logFile, '');
      this.info('Log file cleared');
    } catch (error) {
      this.error('Failed to clear log file', { error: error.message });
    }
  }
}

// Export singleton instance
export const logger = new Logger();
