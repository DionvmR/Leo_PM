/**
 * Leo Agent - Core Agent Logic
 * Handles LLM integration, conversation management, and response generation
 */

import { BrandDetector } from './brand-detector.js';
import { LLMManager } from './llm-manager.js';
import { PromptManager } from './prompt-manager.js';
import { MCPManager } from './mcp-manager.js';

export class LeoAgent {
  constructor() {
    this.brandDetector = new BrandDetector();
    this.llmManager = new LLMManager();
    this.promptManager = new PromptManager();
    this.mcpManager = new MCPManager();
    this.conversationHistory = new Map(); // Store conversation history by userId
    this.lastErrorContext = new Map(); // Track last errors by userId for intent detection
  }

  /**
   * Main chat method - processes user input and returns Leo's response
   * @param {string} message - User's message
   * @param {Object} context - Additional context (userId, channel, etc.)
   * @returns {Promise<string>} - Leo's response
   */
  async chat(message, context = {}) {
    const { userId = 'default' } = context;
    
    // Get or create conversation history for this user
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    const history = this.conversationHistory.get(userId);
    
    // Detect intent using TimeoutRecoveryManager
    const lastError = this.lastErrorContext.get(userId);
    const intent = this.mcpManager.timeoutRecoveryManager.detectIntent(message, { lastError });
    
    try {
      // Step 1: Detect brand context
      const brand = await this.brandDetector.detectBrand(message, history);
      
      // Step 2: Build system prompt
      const systemPrompt = await this.promptManager.getSystemPrompt(brand);
      
      // Step 3: Gather relevant data from MCP servers
      const mcpData = await this.mcpManager.gatherData(message, brand);
      
      // Check if we have timeout errors and update error context
      const hasTimeoutError = this.checkForTimeoutErrors(mcpData);
      if (hasTimeoutError) {
        this.lastErrorContext.set(userId, { 
          timestamp: Date.now(), 
          error: 'TIMEOUT_ERROR',
          data: mcpData 
        });
      } else {
        // Clear error context on successful query
        this.lastErrorContext.delete(userId);
      }
      
      // Step 4: Construct the conversation
      const enrichedContent = this.enrichMessageWithData(message, mcpData, intent);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10), // Include last 10 messages for context
        { role: 'user', content: enrichedContent }
      ];
      
      // Step 5: Get response from LLM
      const response = await this.llmManager.generateResponse(messages);
      
      // Step 6: Update conversation history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: response });
      
      // Keep history size manageable
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }
      
      return response;
    } catch (error) {
      console.error('Error in Leo chat:', error);
      return "I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.";
    }
  }
  
  /**
   * Check if MCP data contains timeout errors
   */
  checkForTimeoutErrors(mcpData) {
    if (!mcpData) return false;
    
    // Check each service response for timeout errors
    for (const [service, data] of Object.entries(mcpData)) {
      if (data && data.error === 'TIMEOUT_ERROR') {
        return true;
      }
      if (data && typeof data === 'object') {
        // Check nested responses
        for (const [subKey, subData] of Object.entries(data)) {
          if (subData && subData.error === 'TIMEOUT_ERROR') {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Enriches user message with data from MCP servers
   * @param {string} message - Original user message
   * @param {Object} mcpData - Data gathered from MCP servers
   * @param {string} intent - Intent detected (user_query or debug_mode)
   * @returns {string} - Enriched message
   */
  enrichMessageWithData(message, mcpData, intent = 'user_query') {
    if (!mcpData || Object.keys(mcpData).length === 0) {
      return message;
    }
    
    let enrichedMessage = message;
    
    // Handle differently based on intent
    if (intent === 'debug_mode') {
      enrichedMessage += '\n\n---\n[DEBUG MODE DETECTED]\nThe user appears to be asking about timeout errors or debugging API issues.\n';
    } else {
      enrichedMessage += '\n\n---\nRelevant Context from Connected Systems:\n';
    }
    
    // Format Atlassian data (Jira/Confluence)
    if (mcpData.atlassian) {
      if (mcpData.atlassian.jira) {
        enrichedMessage += '\n### JIRA Issues:\n';
        
        // Check if it's a timeout error with recovery options
        if (mcpData.atlassian.jira.error === 'TIMEOUT_ERROR') {
          enrichedMessage += this.formatTimeoutError(mcpData.atlassian.jira, 'Jira', intent);
        } else {
          try {
            const jiraData = typeof mcpData.atlassian.jira === 'string' 
              ? JSON.parse(mcpData.atlassian.jira) 
              : mcpData.atlassian.jira;
            enrichedMessage += JSON.stringify(jiraData, null, 2);
          } catch (e) {
            enrichedMessage += JSON.stringify(mcpData.atlassian.jira, null, 2);
          }
        }
      }
      
      if (mcpData.atlassian.confluence) {
        enrichedMessage += '\n\n### Confluence Pages:\n';
        
        // Check if it's a timeout error with recovery options
        if (mcpData.atlassian.confluence.error === 'TIMEOUT_ERROR') {
          enrichedMessage += this.formatTimeoutError(mcpData.atlassian.confluence, 'Confluence', intent);
        } else {
          try {
            const confluenceData = typeof mcpData.atlassian.confluence === 'string'
              ? JSON.parse(mcpData.atlassian.confluence)
              : mcpData.atlassian.confluence;
            enrichedMessage += JSON.stringify(confluenceData, null, 2);
          } catch (e) {
            enrichedMessage += JSON.stringify(mcpData.atlassian.confluence, null, 2);
          }
        }
      }
    }
    
    // Format Google Drive data
    if (mcpData.googleDrive) {
      enrichedMessage += '\n\n### Google Drive Files:\n';
      
      // Check if it's a timeout error with recovery options
      if (mcpData.googleDrive.error === 'TIMEOUT_ERROR') {
        enrichedMessage += this.formatTimeoutError(mcpData.googleDrive, 'Google Drive', intent);
      } else {
        try {
          const driveData = typeof mcpData.googleDrive === 'string'
            ? JSON.parse(mcpData.googleDrive)
            : mcpData.googleDrive;
          enrichedMessage += JSON.stringify(driveData, null, 2);
        } catch (e) {
          enrichedMessage += JSON.stringify(mcpData.googleDrive, null, 2);
        }
      }
    }
    
    if (intent === 'debug_mode') {
      enrichedMessage += '\n\n---\nProvide technical analysis of the timeout errors and suggest which recovery strategy would be most effective.';
    } else {
      enrichedMessage += '\n\n---\nIf any services timed out, present the recovery options to the user in a friendly way and ask which approach they\'d prefer. Otherwise, analyze and summarize the data to answer the user\'s question.';
    }
    
    return enrichedMessage;
  }
  
  /**
   * Format timeout error for inclusion in enriched message
   */
  formatTimeoutError(errorData, serviceName, intent) {
    let formatted = `\n**TIMEOUT ERROR**\n`;
    formatted += `${errorData.summary}\n\n`;
    
    if (errorData.performanceContext) {
      formatted += `**Performance Stats:**\n`;
      formatted += `- Average response time: ${errorData.performanceContext.averageResponseTime}ms\n`;
      formatted += `- 95th percentile: ${errorData.performanceContext.p95ResponseTime}ms\n`;
      formatted += `- Recent success rate: ${errorData.performanceContext.recentSuccessRate}%\n\n`;
    }
    
    if (intent === 'debug_mode') {
      // Technical details for debugging
      formatted += `**Technical Details:**\n`;
      formatted += `- Tool: ${errorData.tool}\n`;
      formatted += `- Attempts made: ${errorData.attemptsMade}\n`;
      formatted += `- Error: ${errorData.message}\n\n`;
      
      formatted += `**Recovery Strategies:**\n`;
      errorData.recoveryOptions.forEach((option, index) => {
        formatted += `${index + 1}. ${option.description}\n`;
        formatted += `   - Action: ${option.action}\n`;
        formatted += `   - Timeout: ${option.timeout}ms\n`;
        formatted += `   - Estimated success rate: ${Math.round(option.estimatedSuccessRate * 100)}%\n`;
        if (option.params) {
          formatted += `   - Parameters: ${JSON.stringify(option.params)}\n`;
        }
        formatted += '\n';
      });
    } else {
      // User-friendly options
      formatted += `**What would you like me to try?**\n`;
      errorData.recoveryOptions.slice(0, -1).forEach((option, index) => {
        formatted += `${index + 1}. ${option.description}\n`;
      });
      formatted += `${errorData.recoveryOptions.length}. Skip this search and proceed without ${serviceName} data\n`;
    }
    
    return formatted;
  }
  
  /**
   * Clear conversation history for a specific user
   * @param {string} userId - User ID
   */
  clearHistory(userId = 'default') {
    this.conversationHistory.delete(userId);
  }
  
  /**
   * Get conversation history for a specific user
   * @param {string} userId - User ID
   * @returns {Array} - Conversation history
   */
  getHistory(userId = 'default') {
    return this.conversationHistory.get(userId) || [];
  }
}
