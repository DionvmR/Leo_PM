/**
 * Leo Agent - Permission-based MCP Access Version
 * Handles LLM integration, conversation management, and response generation
 * Modified to ask for permission before accessing MCP servers
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
    this.pendingMCPRequests = new Map(); // Store pending MCP requests by userId
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
    
    try {
      // Step 1: Detect brand context
      const brand = await this.brandDetector.detectBrand(message, history);
      
      // Step 2: Build system prompt
      const systemPrompt = await this.promptManager.getSystemPrompt(brand);
      
      // Step 3: Check if user is confirming a pending MCP request
      const pendingRequest = this.pendingMCPRequests.get(userId);
      if (pendingRequest && this.isConfirmation(message)) {
        // User confirmed - execute the MCP query
        this.pendingMCPRequests.delete(userId);
        const mcpData = await this.mcpManager.gatherData(pendingRequest.query, pendingRequest.brand);
        
        // Construct conversation with MCP data
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10),
          { role: 'user', content: this.enrichMessageWithData(pendingRequest.originalMessage, mcpData) }
        ];
        
        const response = await this.llmManager.generateResponse(messages);
        
        // Update history
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: response });
        
        this.trimHistory(history);
        return response;
      } else if (pendingRequest && this.isDenial(message)) {
        // User denied - clear pending request
        this.pendingMCPRequests.delete(userId);
        
        // Continue with normal response without MCP data
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10),
          { role: 'user', content: message }
        ];
        
        const response = await this.llmManager.generateResponse(messages);
        
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: response });
        
        this.trimHistory(history);
        return response;
      }
      
      // Step 4: Check if message needs MCP data
      const mcpIntent = this.detectMCPIntent(message);
      
      if (mcpIntent) {
        // Store pending request
        this.pendingMCPRequests.set(userId, {
          query: message,
          brand: brand,
          originalMessage: message,
          intent: mcpIntent
        });
        
        // Return permission request based on intent
        const permissionMessage = this.generatePermissionRequest(mcpIntent, message);
        
        // Update history with the permission request
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: permissionMessage });
        
        this.trimHistory(history);
        return permissionMessage;
      }
      
      // Step 5: Normal response without MCP data
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
        { role: 'user', content: message }
      ];
      
      const response = await this.llmManager.generateResponse(messages);
      
      // Update history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: response });
      
      this.trimHistory(history);
      return response;
      
    } catch (error) {
      console.error('Error in Leo chat:', error);
      return "I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.";
    }
  }
  
  /**
   * Detect if the message requires MCP data
   * @param {string} message - User's message
   * @returns {Object|null} - Intent object or null
   */
  detectMCPIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Jira intent
    if (/jira|issue|ticket|sprint|backlog|epic|story|bug/i.test(message)) {
      return {
        type: 'jira',
        keywords: message.match(/jira|issue|ticket|sprint|backlog|epic|story|bug/gi) || []
      };
    }
    
    // Confluence intent
    if (/confluence|doc|documentation|prd|spec|wiki|charter/i.test(message)) {
      return {
        type: 'confluence',
        keywords: message.match(/confluence|doc|documentation|prd|spec|wiki|charter/gi) || []
      };
    }
    
    // Google Drive intent
    if (/drive|google.*doc|sheet|file|folder/i.test(message)) {
      return {
        type: 'drive',
        keywords: message.match(/drive|google.*doc|sheet|file|folder/gi) || []
      };
    }
    
    // Project/general intent
    if (/project.*status|update|progress/i.test(message)) {
      return {
        type: 'all',
        keywords: ['project', 'status']
      };
    }
    
    return null;
  }
  
  /**
   * Generate permission request message based on intent
   * @param {Object} intent - Intent object
   * @param {string} originalMessage - Original user message
   * @returns {string} - Permission request message
   */
  generatePermissionRequest(intent, originalMessage) {
    const baseMessage = "I can help you with that. To provide the most accurate information, ";
    
    switch (intent.type) {
      case 'jira':
        return baseMessage + "I'll need to search your Jira issues. Would you like me to look up recent tickets and issues related to your query?";
        
      case 'confluence':
        return baseMessage + "I'll need to search your Confluence pages. Would you like me to find relevant documentation and wiki pages?";
        
      case 'drive':
        return baseMessage + "I'll need to search your Google Drive. Would you like me to look for relevant documents and files?";
        
      case 'all':
        return baseMessage + "I'll need to search across Jira, Confluence, and Google Drive for comprehensive project information. Would you like me to do that?";
        
      default:
        return baseMessage + "I'll need to access external systems. Would you like me to search for relevant information?";
    }
  }
  
  /**
   * Check if message is a confirmation
   * @param {string} message - User's message
   * @returns {boolean}
   */
  isConfirmation(message) {
    const confirmPatterns = /^(yes|yeah|yep|sure|ok|okay|please|go ahead|do it|search|find|look)/i;
    return confirmPatterns.test(message.trim());
  }
  
  /**
   * Check if message is a denial
   * @param {string} message - User's message
   * @returns {boolean}
   */
  isDenial(message) {
    const denyPatterns = /^(no|nope|nah|don't|dont|stop|cancel|never mind|nevermind)/i;
    return denyPatterns.test(message.trim());
  }
  
  /**
   * Enriches user message with data from MCP servers
   * @param {string} message - Original user message
   * @param {Object} mcpData - Data gathered from MCP servers
   * @returns {string} - Enriched message
   */
  enrichMessageWithData(message, mcpData) {
    if (!mcpData || Object.keys(mcpData).length === 0) {
      return message;
    }
    
    let enrichedMessage = message + '\n\n---\nRelevant Context from Connected Systems:\n';
    
    // Format Atlassian data (Jira/Confluence)
    if (mcpData.atlassian) {
      if (mcpData.atlassian.jira) {
        enrichedMessage += '\n### JIRA Issues:\n';
        try {
          const jiraData = typeof mcpData.atlassian.jira === 'string' 
            ? JSON.parse(mcpData.atlassian.jira) 
            : mcpData.atlassian.jira;
          enrichedMessage += JSON.stringify(jiraData, null, 2);
        } catch (e) {
          enrichedMessage += mcpData.atlassian.jira;
        }
      }
      
      if (mcpData.atlassian.confluence) {
        enrichedMessage += '\n\n### Confluence Pages:\n';
        try {
          const confluenceData = typeof mcpData.atlassian.confluence === 'string'
            ? JSON.parse(mcpData.atlassian.confluence)
            : mcpData.atlassian.confluence;
          enrichedMessage += JSON.stringify(confluenceData, null, 2);
        } catch (e) {
          enrichedMessage += mcpData.atlassian.confluence;
        }
      }
    }
    
    // Format Google Drive data
    if (mcpData.googleDrive) {
      enrichedMessage += '\n\n### Google Drive Files:\n';
      try {
        const driveData = typeof mcpData.googleDrive === 'string'
          ? JSON.parse(mcpData.googleDrive)
          : mcpData.googleDrive;
        enrichedMessage += JSON.stringify(driveData, null, 2);
      } catch (e) {
        enrichedMessage += mcpData.googleDrive;
      }
    }
    
    enrichedMessage += '\n\n---\nPlease analyze and summarize the above data to answer the user\'s question.';
    
    return enrichedMessage;
  }
  
  /**
   * Trim conversation history to keep it manageable
   * @param {Array} history - Conversation history
   */
  trimHistory(history) {
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }
  
  /**
   * Clear conversation history for a specific user
   * @param {string} userId - User ID
   */
  clearHistory(userId = 'default') {
    this.conversationHistory.delete(userId);
    this.pendingMCPRequests.delete(userId);
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
