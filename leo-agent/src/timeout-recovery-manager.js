/**
 * Timeout Recovery Manager
 * Handles timeout errors intelligently with progressive strategies
 */

import { logger } from './logger.js';

export class TimeoutRecoveryManager {
  constructor() {
    // Track failed queries and their patterns
    this.failureHistory = new Map();
    
    // Performance metrics per tool
    this.performanceMetrics = new Map();
    
    // Recovery strategies
    this.strategies = {
      googleDrive: [
        {
          name: 'reduce_pageSize',
          description: 'Get only 5 most recent items',
          apply: (params) => ({ ...params, pageSize: 5 })
        },
        {
          name: 'narrow_by_folder',
          description: 'Search in specific folder',
          apply: (params, context) => {
            if (context?.suggestedFolder) {
              return { ...params, folderId: context.suggestedFolder };
            }
            return params;
          }
        },
        {
          name: 'increase_timeout',
          description: 'Wait up to 30 seconds',
          apply: (params) => params,
          timeoutOverride: 30000
        }
      ],
      
      jira: [
        {
          name: 'limit_results',
          description: 'Get only 3 most recent issues',
          apply: (params) => ({ ...params, limit: 3 })
        },
        {
          name: 'project_specific',
          description: 'Search in specific project',
          apply: (params, context) => {
            if (context?.projectKey) {
              return { 
                ...params, 
                jql: `project = ${context.projectKey} ORDER BY updated DESC` 
              };
            }
            return params;
          }
        },
        {
          name: 'increase_timeout',
          description: 'Wait up to 25 seconds',
          apply: (params) => params,
          timeoutOverride: 25000
        }
      ],
      
      confluence: [
        {
          name: 'limit_results',
          description: 'Get only 3 most recent pages',
          apply: (params) => ({ ...params, limit: 3 })
        },
        {
          name: 'space_specific',
          description: 'Search in specific space',
          apply: (params, context) => {
            if (context?.spaceKey) {
              return {
                ...params,
                query: `space=${context.spaceKey} AND ${params.query || 'type=page'}`
              };
            }
            return params;
          }
        },
        {
          name: 'increase_timeout',
          description: 'Wait up to 25 seconds',
          apply: (params) => params,
          timeoutOverride: 25000
        }
      ]
    };
  }
  
  /**
   * Detect intent from message - is this a debug request or user query?
   */
  detectIntent(message, previousContext = {}) {
    // Check for error/debug indicators
    const debugPatterns = [
      /TIMEOUT_ERROR/i,
      /stack trace/i,
      /error.*occurred/i,
      /failed.*attempt/i,
      /retry.*failed/i
    ];
    
    const isDebugMessage = debugPatterns.some(pattern => pattern.test(message));
    const hadPreviousError = previousContext.lastError !== undefined;
    
    if (isDebugMessage || hadPreviousError) {
      logger.info('Detected debug intent in message', {
        isDebugMessage,
        hadPreviousError,
        messageSnippet: message.substring(0, 100)
      });
      return 'debug_mode';
    }
    
    return 'user_query';
  }
  
  /**
   * Record a timeout failure
   */
  recordFailure(tool, params, duration, error) {
    const key = `${tool}`;
    
    if (!this.failureHistory.has(key)) {
      this.failureHistory.set(key, []);
    }
    
    const failures = this.failureHistory.get(key);
    failures.push({
      timestamp: Date.now(),
      params,
      duration,
      error: error.message
    });
    
    // Keep only last 10 failures per tool
    if (failures.length > 10) {
      failures.shift();
    }
    
    // Update performance metrics
    this.updatePerformanceMetrics(tool, duration);
  }
  
  /**
   * Update performance metrics for a tool
   */
  updatePerformanceMetrics(tool, duration, success = false) {
    if (!this.performanceMetrics.has(tool)) {
      this.performanceMetrics.set(tool, {
        durations: [],
        successCount: 0,
        failureCount: 0
      });
    }
    
    const metrics = this.performanceMetrics.get(tool);
    
    if (success) {
      metrics.successCount++;
      metrics.durations.push(duration);
      
      // Keep only last 50 durations
      if (metrics.durations.length > 50) {
        metrics.durations.shift();
      }
    } else {
      metrics.failureCount++;
    }
  }
  
  /**
   * Get performance statistics for a tool
   */
  getPerformanceStats(tool) {
    const metrics = this.performanceMetrics.get(tool);
    if (!metrics || metrics.durations.length === 0) {
      return null;
    }
    
    const sorted = [...metrics.durations].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    
    return {
      p50: sorted[p50Index],
      p95: sorted[p95Index],
      average: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      successRate: metrics.successCount / (metrics.successCount + metrics.failureCount),
      sampleSize: sorted.length
    };
  }
  
  /**
   * Get next recovery strategy for a failed query
   */
  getNextStrategy(tool, attemptNumber, context = {}) {
    const toolStrategies = this.strategies[tool];
    if (!toolStrategies || attemptNumber >= toolStrategies.length) {
      return null;
    }
    
    return toolStrategies[attemptNumber];
  }
  
  /**
   * Apply a recovery strategy to parameters
   */
  applyStrategy(strategy, params, context = {}) {
    const newParams = strategy.apply(params, context);
    
    return {
      params: newParams,
      timeout: strategy.timeoutOverride || 15000,
      description: strategy.description
    };
  }
  
  /**
   * Get suggested timeout based on performance history
   */
  getSuggestedTimeout(tool, baseTimeout = 15000) {
    const stats = this.getPerformanceStats(tool);
    
    if (!stats || stats.sampleSize < 5) {
      return baseTimeout;
    }
    
    // Use p95 + 20% buffer
    const suggested = Math.ceil(stats.p95 * 1.2);
    
    // Cap at 2x base timeout
    return Math.min(suggested, baseTimeout * 2);
  }
  
  /**
   * Generate recovery options for user
   */
  generateRecoveryOptions(tool, originalParams, context = {}) {
    const strategies = this.strategies[tool] || [];
    const stats = this.getPerformanceStats(tool);
    
    const options = strategies.map((strategy, index) => {
      const applied = this.applyStrategy(strategy, originalParams, context);
      
      return {
        id: `${tool}_${strategy.name}`,
        action: strategy.name,
        description: strategy.description,
        params: applied.params,
        timeout: applied.timeout,
        estimatedSuccessRate: this.estimateSuccessRate(tool, strategy, stats)
      };
    });
    
    // Add a "give up" option
    options.push({
      id: `${tool}_manual`,
      action: 'manual_check',
      description: `Check ${tool} manually`,
      params: null,
      timeout: 0,
      estimatedSuccessRate: 1.0
    });
    
    return options;
  }
  
  /**
   * Estimate success rate for a strategy
   */
  estimateSuccessRate(tool, strategy, stats) {
    if (!stats) return 0.5; // Unknown
    
    // Base success rate
    let rate = stats.successRate || 0.5;
    
    // Adjust based on strategy
    if (strategy.name === 'reduce_pageSize' || strategy.name === 'limit_results') {
      rate += 0.2; // Smaller queries usually work better
    } else if (strategy.name === 'increase_timeout') {
      // Check if p95 is close to current timeout
      if (stats.p95 > 12000) {
        rate += 0.1; // Might help
      }
    }
    
    return Math.min(rate, 0.95);
  }
  
  /**
   * Format error response with recovery options
   */
  formatTimeoutError(tool, params, attemptsMade, context = {}) {
    const options = this.generateRecoveryOptions(tool, params, context);
    const stats = this.getPerformanceStats(tool);
    
    return {
      error: 'TIMEOUT_ERROR',
      tool,
      attemptsMade,
      message: `${tool} is responding slowly`,
      
      // Include performance context
      performanceContext: stats ? {
        averageResponseTime: Math.round(stats.average),
        p95ResponseTime: Math.round(stats.p95),
        recentSuccessRate: Math.round(stats.successRate * 100)
      } : null,
      
      // Recovery options
      recoveryOptions: options,
      
      // Suggested action
      suggestedAction: options[0], // First strategy is usually best
      
      // Human-readable summary
      summary: this.generateErrorSummary(tool, attemptsMade, stats)
    };
  }
  
  /**
   * Generate human-readable error summary
   */
  generateErrorSummary(tool, attemptsMade, stats) {
    let summary = `The ${tool} API timed out after ${attemptsMade} attempts. `;
    
    if (stats && stats.sampleSize > 5) {
      summary += `Recent performance shows ${Math.round(stats.successRate * 100)}% success rate `;
      summary += `with typical response times of ${Math.round(stats.p95 / 1000)}s. `;
    }
    
    summary += 'You can try a different approach or check the service manually.';
    
    return summary;
  }
  
  /**
   * Extract context hints from query
   */
  extractQueryContext(query, tool) {
    const context = {};
    
    if (tool === 'jira' || tool === 'jira_search') {
      // Look for project keys (2+ uppercase letters)
      const projectMatch = query.match(/\b([A-Z]{2,})\b/);
      if (projectMatch) {
        context.projectKey = projectMatch[1];
      }
    } else if (tool === 'confluence' || tool === 'confluence_search') {
      // Look for space indicators
      const spaceMatch = query.match(/space[:\s]+(\w+)/i);
      if (spaceMatch) {
        context.spaceKey = spaceMatch[1];
      }
    } else if (tool === 'drive_search_files') {
      // Look for folder names
      const folderMatch = query.match(/folder[:\s]+"?([^"]+)"?/i);
      if (folderMatch) {
        context.suggestedFolder = folderMatch[1];
      }
    }
    
    return context;
  }
}
