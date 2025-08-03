/**
 * MCP Manager
 * Manages connections to MCP (Model Context Protocol) servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

export class MCPManager {
  constructor() {
    this.servers = new Map();
    this.initialized = false;
    
    // MCP server configurations
    this.serverConfigs = {
      atlassian: {
        command: '/Users/dionvm/Documents/Cline/MCP/mcp-atlassian/venv/bin/mcp-atlassian',
        args: [],
        name: 'Atlassian (Jira/Confluence)',
        enabled: true,
        env: {
          CONFLUENCE_URL: process.env.CONFLUENCE_URL || process.env.ATLASSIAN_URL || 'https://truefirestudios.atlassian.net/wiki',
          CONFLUENCE_USERNAME: process.env.CONFLUENCE_USERNAME || process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
          CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_API_TOKEN || process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN,
          JIRA_URL: process.env.JIRA_URL || process.env.ATLASSIAN_URL || 'https://truefirestudios.atlassian.net',
          JIRA_USERNAME: process.env.JIRA_USERNAME || process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
          JIRA_API_TOKEN: process.env.JIRA_API_TOKEN || process.env.ATLASSIAN_API_TOKEN
        }
      },
      googleDrive: {
        command: 'npx',
        args: ['-y', '@chinchillaenterprises/mcp-google-drive'],
        name: 'Google Drive',
        enabled: true,
        env: {
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
          GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN
        }
      }
    };
  }
  
  /**
   * Initialize MCP server connections
   */
  async initialize() {
    console.log('MCP Manager: Initializing servers...');
    
    for (const [key, config] of Object.entries(this.serverConfigs)) {
      if (config.enabled) {
        try {
          await this.connectServer(key, config);
        } catch (error) {
          console.error(`Failed to connect to ${config.name}:`, error.message);
        }
      }
    }
    
    this.initialized = true;
    console.log('MCP Manager: Initialization complete');
  }
  
  /**
   * Connect to a specific MCP server
   */
  async connectServer(key, config) {
    console.log(`Connecting to ${config.name}...`);
    console.log(`Command: ${config.command}`);
    console.log(`Args: ${JSON.stringify(config.args)}`);
    
    try {
      // Merge config env with process env, config env takes precedence
      const mergedEnv = {
        ...process.env,
        ...(config.env || {})
      };
      
      // Log environment variables for debugging (without showing tokens)
      if (config.env) {
        console.log(`Environment variables for ${config.name}:`);
        Object.keys(config.env).forEach(key => {
          if (key.includes('TOKEN') || key.includes('SECRET')) {
            console.log(`  ${key}: ${mergedEnv[key] ? '[SET]' : '[NOT SET]'}`);
          } else {
            console.log(`  ${key}: ${mergedEnv[key] || '[NOT SET]'}`);
          }
        });
      }
      
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: mergedEnv,
        // Add transport-level timeout configuration
        timeout: 30000 // 30 seconds
      });
      
      // Add debug logging for process spawning
      transport.process.on('spawn', () => {
        console.log(`${config.name} process spawned successfully`);
      });
      
      transport.process.on('error', (error) => {
        console.error(`${config.name} process error:`, error);
      });
      
      transport.process.stderr.on('data', (data) => {
        console.error(`${config.name} stderr:`, data.toString());
      });
      
      const client = new Client({
        name: `leo-agent-${key}`,
        version: '1.0.0'
      }, {
        capabilities: {
          // Add any required capabilities
        }
      });
      
      // Set timeout at protocol level
      client._protocol.timeout = 30000; // 30 seconds
      
      // Add connection timeout with better error handling
      console.log(`${config.name}: Starting connection...`);
      const connectStartTime = Date.now();
      
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 15s')), 15000)
      );
      
      try {
        await Promise.race([connectPromise, timeoutPromise]);
        console.log(`${config.name}: Connected in ${Date.now() - connectStartTime}ms`);
      } catch (error) {
        console.error(`${config.name}: Connection failed after ${Date.now() - connectStartTime}ms`);
        throw error;
      }
      
      // Test the connection with a simple call
      const tools = await Promise.race([
        client.listTools(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('List tools timeout')), 10000)
        )
      ]);
      
      console.log(`${config.name} connected with ${tools.tools.length} tools available`);
      
      if (tools.tools.length === 0) {
        console.warn(`WARNING: ${config.name} connected but has 0 tools available!`);
      } else {
        console.log(`Available tools for ${config.name}:`, tools.tools.map(t => t.name));
      }
      
      this.servers.set(key, {
        client,
        config,
        tools: tools.tools
      });
    } catch (error) {
      console.error(`Failed to connect to ${config.name}:`, error);
      
      // Add specific error context
      if (error.message.includes('timeout')) {
        console.error('This appears to be a timeout issue. Check your network connection and server responsiveness.');
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        console.error('Authentication failed. Check your API tokens and credentials.');
      }
      
      throw error;
    }
  }
  
  /**
   * Gather data from MCP servers based on the query
   * @param {string} query - User's query
   * @param {string|null} brand - Brand context
   * @returns {Promise<Object>} - Data from various MCP servers
   */
  async gatherData(query, brand = null) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const results = {};
    const lowerQuery = query.toLowerCase();
    
    // Determine which servers to query based on the query content
    const queryPatterns = {
      jira: /jira|issue|ticket|sprint|backlog|epic|story/i,
      confluence: /confluence|doc|documentation|prd|spec|wiki/i,
      googleDrive: /drive|google|document|sheet|file|folder/i,
      both: /project|status|update|progress/i
    };
    
    // Check Atlassian (Jira/Confluence)
    if (this.servers.has('atlassian') && 
        (queryPatterns.jira.test(query) || 
         queryPatterns.confluence.test(query) || 
         queryPatterns.both.test(query))) {
      
      try {
        results.atlassian = await this.queryAtlassian(query, brand);
      } catch (error) {
        console.error('Error querying Atlassian:', error);
        results.atlassian = { error: error.message };
      }
    }
    
    // Check Google Drive
    if (this.servers.has('googleDrive') && 
        (queryPatterns.googleDrive.test(query) || 
         queryPatterns.both.test(query))) {
      
      try {
        results.googleDrive = await this.queryGoogleDrive(query, brand);
      } catch (error) {
        console.error('Error querying Google Drive:', error);
        results.googleDrive = { error: error.message };
      }
    }
    
    return results;
  }
  
  /**
   * Query Atlassian (Jira/Confluence) servers - simplified without brand filtering
   */
  async queryAtlassian(query, brand) {
    const server = this.servers.get('atlassian');
    if (!server) return null;
    
    const results = {};
    
    // Search Jira if query mentions issues/tickets
    if (/jira|issue|ticket|sprint|bug|task/i.test(query)) {
      try {
        // Simple query - just get recent issues
        // No brand filtering - let the LLM handle relevance
        const jql = 'ORDER BY updated DESC';
        
        const jiraResult = await this.callToolWithTimeout('atlassian', 'jira_search', {
          jql,
          limit: 10  // Can use higher limit since queries are simpler
        }, 15000);
        
        if (jiraResult && !jiraResult.error) {
          results.jira = jiraResult;
        } else {
          results.jira = {
            error: jiraResult?.error || 'Jira search failed',
            suggestion: 'Try being more specific in your query'
          };
        }
      } catch (error) {
        console.error('Jira search error:', error);
        results.jira = { 
          error: error.message,
          suggestion: 'Jira search timed out - try again later'
        };
      }
    }
    
    // Search Confluence if query mentions docs/PRDs
    if (/confluence|doc|prd|spec|wiki|charter|project/i.test(query)) {
      try {
        // Extract key search terms from the query
        let searchTerms = [];
        
        // Get version numbers if mentioned
        const versionMatch = query.match(/(\d+\.\d+)/);
        if (versionMatch) {
          searchTerms.push(versionMatch[1]);
        }
        
        // Get any quoted terms
        const quotedTerms = query.match(/"([^"]+)"/g);
        if (quotedTerms) {
          searchTerms.push(...quotedTerms.map(t => t.replace(/"/g, '')));
        }
        
        // Get important keywords (excluding common words)
        const keywords = query.toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 3 && 
                         !['what', 'where', 'when', 'show', 'find', 'tell', 'about'].includes(word));
        
        if (keywords.length > 0) {
          searchTerms.push(...keywords.slice(0, 3)); // Take top 3 keywords
        }
        
        let cql;
        if (searchTerms.length > 0) {
          // Simple text search with keywords
          const searchQuery = searchTerms.join(' ');
          cql = `text ~ "${searchQuery}" ORDER BY lastmodified DESC`;
        } else {
          // Fallback to just recent pages
          cql = 'type=page ORDER BY lastmodified DESC';
        }
        
        const confluenceResult = await this.callToolWithTimeout('atlassian', 'confluence_search', {
          query: cql,
          limit: 10  // Can use higher limit with simpler queries
        }, 15000);
        
        if (confluenceResult && !confluenceResult.error) {
          results.confluence = confluenceResult;
        } else {
          results.confluence = {
            error: confluenceResult?.error || 'Confluence search failed',
            suggestion: 'Try using specific keywords or document titles'
          };
        }
      } catch (error) {
        console.error('Confluence search error:', error);
        results.confluence = { 
          error: 'Confluence search timed out',
          suggestion: 'Try using fewer or more specific search terms'
        };
      }
    }
    
    return results;
  }
  
  /**
   * Query Google Drive - simplified without brand filtering
   */
  async queryGoogleDrive(query, brand) {
    const server = this.servers.get('googleDrive');
    if (!server) return null;
    
    try {
      // Extract meaningful search terms from the query
      let searchTerms = [];
      
      // Get any quoted terms first
      const quotedTerms = query.match(/"([^"]+)"/g);
      if (quotedTerms) {
        searchTerms.push(...quotedTerms.map(t => t.replace(/"/g, '')));
      }
      
      // Get version numbers
      const versionMatch = query.match(/(\d+\.\d+)/);
      if (versionMatch) {
        searchTerms.push(versionMatch[1]);
      }
      
      // Get important keywords (excluding common words)
      const keywords = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && 
                       !['what', 'where', 'when', 'show', 'find', 'tell', 'about', 'drive', 'google', 'document', 'file'].includes(word));
      
      if (keywords.length > 0) {
        searchTerms.push(...keywords.slice(0, 3)); // Take top 3 keywords
      }
      
      // Build search query from terms
      const searchQuery = searchTerms.length > 0 ? searchTerms.join(' ') : 'type:folder OR type:document';
      
      // No brand filtering - let the LLM handle relevance
      const result = await this.callToolWithTimeout('googleDrive', 'drive_search_files', {
        query: searchQuery,
        pageSize: 10
      }, 15000);
      
      return result;
    } catch (error) {
      console.error('Google Drive search error:', error);
      return {
        error: error.message,
        suggestion: 'Try searching with more specific terms or check your Google Drive connection'
      };
    }
  }
  
  /**
   * Call a specific MCP tool directly
   * @param {string} serverKey - Server identifier
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   */
  async callTool(serverKey, toolName, params = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const server = this.servers.get(serverKey);
    if (!server) {
      throw new Error(`Server ${serverKey} not found or not connected`);
    }
    
    try {
      console.log(`Calling tool ${toolName} on ${serverKey} with params:`, JSON.stringify(params, null, 2));
      const startTime = Date.now();
      
      // Create a proper timeout wrapper since SDK timeout isn't working
      const callPromise = server.client.callTool(toolName, params);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tool ${toolName} timed out after 30 seconds (custom timeout)`));
        }, 30000); // 30 second timeout
      });
      
      const result = await Promise.race([callPromise, timeoutPromise]);
      
      console.log(`Tool ${toolName} completed in ${Date.now() - startTime}ms`);
      return result.content[0];
    } catch (error) {
      console.error(`Error calling tool ${toolName} on ${serverKey}:`, error);
      console.error(`Full error details:`, error);
      throw error;
    }
  }
  
  /**
   * Call a tool with timeout
   * @param {string} serverKey - Server identifier
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   * @param {number} timeout - Timeout in milliseconds
   */
  async callToolWithTimeout(serverKey, toolName, params = {}, timeout = 30000) {
    let timeoutId;
    let resolved = false;
    
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        resolved = true;
        reject(new Error(`Tool ${toolName} timed out after ${timeout}ms`));
      }, timeout);
    });
    
    try {
      const result = await Promise.race([
        this.callTool(serverKey, toolName, params).then(res => {
          resolved = true;
          return res;
        }).catch(err => {
          // Only throw if we haven't already timed out
          if (!resolved) {
            resolved = true;
            throw err;
          }
          // If we've already timed out, ignore this error
          return null;
        }),
        timeoutPromise
      ]);
      
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.message.includes('timed out after')) {
        console.warn(`${toolName} timed out, returning partial results`);
        return {
          error: 'Search timed out',
          message: 'The search took too long. Try using more specific search terms.',
          partial: true
        };
      }
      
      // Only throw non-timeout errors if we haven't already resolved
      if (!resolved || !error.message.includes('Request timed out')) {
        throw error;
      }
      
      // If this is an MCP timeout that came after our timeout, return our timeout result
      return {
        error: 'Search timed out',
        message: 'The search took too long. Try using more specific search terms.',
        partial: true
      };
    }
  }
  
  /**
   * Get list of available tools from all servers
   */
  async getAvailableTools() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const tools = {};
    
    for (const [key, server] of this.servers) {
      tools[key] = server.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
    }
    
    return tools;
  }
  
  /**
   * Check if a server is available
   * @param {string} serverName - Server name
   * @returns {boolean} - Whether server is available
   */
  isServerAvailable(serverName) {
    return this.servers.has(serverName);
  }
  
  /**
   * Perform health check on all connected servers
   * @returns {Object} - Health status of each server
   */
  async healthCheck() {
    const health = {};
    
    for (const [key, server] of this.servers) {
      try {
        // Simple health check - list tools with timeout
        const start = Date.now();
        await Promise.race([
          server.client.listTools(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        health[key] = {
          status: 'healthy',
          responseTime: Date.now() - start,
          name: server.config.name
        };
      } catch (error) {
        health[key] = {
          status: 'unhealthy',
          error: error.message,
          name: server.config.name
        };
      }
    }
    
    return health;
  }
  
  /**
   * Get status of all MCP servers
   * @returns {Object} - Status of each server
   */
  getStatus() {
    const status = {};
    
    for (const [key, config] of Object.entries(this.serverConfigs)) {
      const isConnected = this.servers.has(key);
      status[key] = {
        name: config.name,
        available: isConnected,
        enabled: config.enabled,
        tools: isConnected ? this.servers.get(key).tools.length : 0
      };
    }
    
    return status;
  }
  
  /**
   * Disconnect all servers
   */
  async disconnect() {
    for (const [key, server] of this.servers) {
      try {
        await server.client.close();
        console.log(`Disconnected from ${server.config.name}`);
      } catch (error) {
        console.error(`Error disconnecting from ${key}:`, error);
      }
    }
    
    this.servers.clear();
    this.initialized = false;
  }
}
