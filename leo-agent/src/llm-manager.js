/**
 * LLM Manager - Handles connections to various LLM providers
 * Currently supports OpenAI, with architecture for adding more providers
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

export class LLMManager {
  constructor() {
    this.provider = config.get('llm.provider') || 'openai';
    this.model = config.get('llm.model') || 'gpt-3.5-turbo';
    this.maxTokens = config.get('llm.maxTokens') || 2000;
    this.temperature = config.get('llm.temperature') || 0.7;
    
    // Initialize providers
    this.providers = {
      openai: this.initOpenAI(),
      claude: this.initClaude(),
      local: null   // Future: Local models via Ollama/LM Studio
    };
  }
  
  /**
   * Initialize OpenAI client
   */
  initOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: OPENAI_API_KEY not found in environment variables');
      return null;
    }
    
    return new OpenAI({
      apiKey: apiKey
    });
  }
  
  /**
   * Initialize Claude (Anthropic) client
   */
  initClaude() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('Warning: ANTHROPIC_API_KEY not found in environment variables');
      return null;
    }
    
    return new Anthropic({
      apiKey: apiKey
    });
  }
  
  /**
   * Generate a response from the LLM
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(messages) {
    switch (this.provider) {
      case 'openai':
        return this.generateOpenAIResponse(messages);
      case 'claude':
        return this.generateClaudeResponse(messages);
      case 'local':
        // Future implementation
        throw new Error('Local LLM provider not yet implemented');
      default:
        throw new Error(`Unknown LLM provider: ${this.provider}`);
    }
  }
  
  /**
   * Generate response using OpenAI
   * @param {Array} messages - Conversation messages
   * @returns {Promise<string>} - Generated response
   */
  async generateOpenAIResponse(messages) {
    const client = this.providers.openai;
    if (!client) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }
    
    try {
      const response = await client.chat.completions.create({
        model: this.model,
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      // Handle specific error types
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your credentials.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service error. Please try again later.');
      }
      
      throw new Error(`LLM Error: ${error.message}`);
    }
  }
  
  /**
   * Generate response using Claude (Anthropic)
   * @param {Array} messages - Conversation messages
   * @returns {Promise<string>} - Generated response
   */
  async generateClaudeResponse(messages) {
    const client = this.providers.claude;
    if (!client) {
      throw new Error('Claude client not initialized. Please check your API key.');
    }
    
    try {
      // Convert messages format for Claude
      // Claude expects a different format than OpenAI
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');
      
      // Map the model name to Claude's naming convention
      let claudeModel = this.model;
      if (claudeModel === 'claude-3-opus') {
        claudeModel = 'claude-3-opus-20240229';
      } else if (claudeModel === 'claude-3-sonnet') {
        claudeModel = 'claude-3-5-sonnet-20241022';
      } else if (claudeModel === 'claude-3-haiku') {
        claudeModel = 'claude-3-haiku-20240307';
      } else if (claudeModel === 'claude-2.1') {
        claudeModel = 'claude-2.1';
      }
      
      const response = await client.messages.create({
        model: claudeModel,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemMessage,
        messages: userMessages
      });
      
      return response.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error);
      
      // Handle specific error types
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key. Please check your credentials.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('Claude service error. Please try again later.');
      }
      
      throw new Error(`Claude Error: ${error.message}`);
    }
  }
  
  /**
   * Switch to a different LLM provider
   * @param {string} provider - Provider name (openai, claude, local)
   * @param {Object} options - Provider-specific options
   */
  async switchProvider(provider, options = {}) {
    if (!['openai', 'claude', 'local'].includes(provider)) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    this.provider = provider;
    
    // Update provider-specific settings
    if (options.model) this.model = options.model;
    if (options.maxTokens) this.maxTokens = options.maxTokens;
    if (options.temperature) this.temperature = options.temperature;
    
    // Save to config
    config.set('llm.provider', provider);
    if (options.model) config.set('llm.model', options.model);
  }
  
  /**
   * Get current provider information
   * @returns {Object} - Provider info
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      available: this.providers[this.provider] !== null
    };
  }
  
  /**
   * List available models for current provider
   * @returns {Array<string>} - Available models
   */
  getAvailableModels() {
    const models = {
      openai: [
        'gpt-4o-mini-2025-04-16',
        'gpt-4o-mini',
        'gpt-4o',
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k'
      ],
      claude: [
        'claude-3-opus',
        'claude-3-sonnet',
        'claude-3-haiku',
        'claude-2.1'
      ],
      local: [
        // Will be dynamically fetched from Ollama/LM Studio
      ]
    };
    
    return models[this.provider] || [];
  }
  
  /**
   * Estimate token count for messages
   * @param {Array} messages - Messages to count
   * @returns {number} - Estimated token count
   */
  estimateTokens(messages) {
    // Simple estimation: ~4 characters per token
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Test the current LLM connection
   * @returns {Promise<boolean>} - True if connection works
   */
  async testConnection() {
    try {
      const response = await this.generateResponse([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello, I am working!" to confirm the connection.' }
      ]);
      
      return response.includes('Hello') && response.includes('working');
    } catch (error) {
      console.error('LLM connection test failed:', error);
      return false;
    }
  }
}
