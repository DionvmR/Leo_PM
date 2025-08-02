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
      
      // Step 3: Gather relevant data from MCP servers
      const mcpData = await this.mcpManager.gatherData(message, brand);
      
      // Step 4: Construct the conversation
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10), // Include last 10 messages for context
        { role: 'user', content: this.enrichMessageWithData(message, mcpData) }
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
