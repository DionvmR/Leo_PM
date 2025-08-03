/**
 * MCP Manager - Fixed version with better timeout handling
 * Manages connections to MCP (Model Context Protocol) servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPManager {
  constructor() {
    this.servers = new Map();
    this.initialized = false;
    this.connectionPool = new Map(); // Reuse connections
    
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
   * Get or create a connection for a server
   */
  async getConnection(key) {
    // Check if we have a live connection in the pool
    if (this.connectionPool.has(key)) {
      const conn = this.connectionPool.get(key);
      try {
        // Test if connection is still alive
        await Promise.race([
          conn.client.listTools(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 2000))
        ]);
        return conn;
      } catch (error) {
        console.log(`Connection for ${key} is stale, reconnecting...`);
        this.connectionPool.delete(key);
      }
    }
    
    // Need to create a new connection
    const config = this.serverConfigs[key];
    if (!config) {
      throw new Error(`Server ${key} not configured`);
    }
    
    await this.connectServer(key, config);
    return this.servers.get(key);
  }
  
  /**
   * Connect to a specific MCP server
   */
  async connectServer(key, config) {
    console.log(`Connecting to ${config.name}...`);
    
    try {
      const mergedEnv = {
        ...process.env,
        ...(config.env || {})
      };
      
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: mergedEnv
      });
      
      const client = new Client({
        name: `leo-agent-${key}`,
        version: '1.0.0'
      }, {
        capabilities: {}
      });
      
      // Override the default protocol timeout
      const originalConnect = client.connect.bind(client);
      client.connect = async function(transport) {
        await originalConnect(transport);
        // Set a more reasonable timeout after connection
        if (this._protocol && this._protocol._requestHandlers) {
          const originalSend = this._protocol._sendRequest.bind(this._protocol);
          this._protocol._sendRequest = async function(request) {
            // Set a 20-second timeout for all requests
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error(`Request timeout: ${request.method}`)), 20000);
            });
            return Promise.race([originalSend(request), timeoutPromise]);
          };
        }
        return this;
      };
      
      // Connect with timeout
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      // Test the connection
      const tools = await Promise.race([
        client.listTools(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('List tools timeout')), 5000)
        )
      ]);
      
      console.log(`${config.name} connected with ${tools.tools.length} tools available`);
      
      const serverInfo = {
        client,
        config,
        tools: tools.tools,
        transport
      };
      
      this.servers.set(key, serverInfo);
      this.connectionPool.set(key, serverInfo);
      
    } catch (error) {
      console.error(`Failed to connect to ${config.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Query Atlassian with much simpler queries and retry logic
   */
  async queryAtlassian(query, brand) {
    try {
      const server = await this.getConnection('atlassian');
      if (!server) return null;
      
      const results = {};
      
      // For Jira - use extremely simple query
      if (/jira|issue|ticket|sprint|bug|task/i.test(query)) {
        try {
          console.log('Attempting simple Jira query...');
          
          // Start with just 3 recent items
          let jiraResult = await this.callToolWithRetry('atlassian', 'jira_search', {
            jql: 'ORDER BY updated DESC',
            limit: 3
          }, 10000, 2); // 10s timeout, 2 retries
          
          if (jiraResult && !jiraResult.error) {
            results.jira = jiraResult;
          } else {
            // If that fails, try project-specific query
            const projectMatch = query.match(/\b([A-Z]{2,})\b/);
            if (projectMatch) {
              console.log(`Trying project-specific query for ${projectMatch[1]}...`);
              jiraResult = await this.callToolWithRetry('atlassian', 'jira_search', {
                jql: `project = ${projectMatch[1]} ORDER BY updated DESC`,
                limit: 3
              }, 10000, 1);
              
              if (jiraResult && !jiraResult.error) {
                results.jira = jiraResult;
              }
            }
            
            if (!results.jira) {
              results.jira = {
                error: 'Jira search failed - API may be slow',
                suggestion: 'Try searching for specific project keys (e.g., "PROJ-123")'
              };
            }
          }
        } catch (error) {
          console.error('Jira search error:', error);
          results.jira = { 
            error: 'Jira API timeout',
            suggestion: 'The Atlassian API is responding slowly. Try again later.'
          };
        }
      }
      
      // For Confluence - use very simple query
      if (/confluence|doc|prd|spec|wiki|charter|project/i.test(query)) {
        try {
          console.log('Attempting simple Confluence query...');
          
          // Just get 3 recent pages
          const confluenceResult = await this.callToolWithRetry('atlassian', 'confluence_search', {
            query: 'type=page ORDER BY lastmodified DESC',
            limit: 3
          }, 10000, 2);
          
          if (confluenceResult && !confluenceResult.error) {
            results.confluence = confluenceResult;
          } else {
            results.confluence = {
              error: 'Confluence search failed - API may be slow',
              suggestion: 'Try searching with specific page titles'
            };
          }
        } catch (error) {
          console.error('Confluence search error:', error);
          results.confluence = { 
            error: 'Confluence API timeout',
            suggestion: 'The Atlassian API is responding slowly. Try again later.'
          };
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in queryAtlassian:', error);
      return { error: error.message };
    }
  }
  
  /**
   * Query Google Drive - this seems to work fine
   */
  async queryGoogleDrive(query, brand) {
    try {
      const server = await this.getConnection('googleDrive');
      if (!server) return null;
      
      // Extract search terms
      let searchTerms = [];
      
      const quotedTerms = query.match(/"([^"]+)"/g);
      if (quotedTerms) {
        searchTerms.push(...quotedTerms.map(t => t.replace(/"/g, '')));
      }
      
      const versionMatch = query.match(/(\d+\.\d+)/);
      if (versionMatch) {
        searchTerms.push(versionMatch[1]);
      }
      
      const keywords = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && 
                       !['what', 'where', 'when', 'show', 'find', 'tell', 'about', 'drive', 'google', 'document', 'file'].includes(word));
      
      if (keywords.length > 0) {
        searchTerms.push(...keywords.slice(0, 3));
      }
      
      const searchQuery = searchTerms.length > 0 ? searchTerms.join(' ') : 'type:folder OR type:document';
      
      const result = await this.callToolWithRetry('googleDrive', 'drive_search_files', {
        query: searchQuery,
        pageSize: 10
      }, 15000, 2);
      
      return result;
    } catch (error) {
      console.error('Google Drive search error:', error);
      return {
        error: error.message,
        suggestion: 'Try searching with more specific terms'
      };
    }
  }
  
  /**
   * Call a tool with retry logic
   */
  async callToolWithRetry(serverKey, toolName, params = {}, timeout = 15000, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for ${toolName}...`);
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
        
        const result = await this.callToolWithTimeout(serverKey, toolName, params, timeout);
        if (result && !result.error) {
          return result;
        }
        
        lastError = result?.error || 'Unknown error';
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed for ${toolName}:`, error.message);
      }
    }
    
    // All retries failed
    return {
      error: `Failed after ${maxRetries + 1} attempts`,
      message: lastError?.message || lastError,
      partial: true
    };
  }
  
  /**
   * Call a tool with timeout
   */
  async callToolWithTimeout(serverKey, toolName, params = {}, timeout = 15000) {
    const server = await this.getConnection(serverKey);
    if (!server) {
      throw new Error(`Server ${serverKey} not available`);
    }
    
    const startTime = Date.now();
    console.log(`Calling ${toolName} with ${timeout}ms timeout...`);
    
    try {
      const callPromise = server.client.callTool(toolName, params);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
      });
      
      const result = await Promise.race([callPromise, timeoutPromise]);
      
      console.log(`${toolName} completed in ${Date.now() - startTime}ms`);
      return result.content[0];
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${toolName} failed after ${duration}ms:`, error.message);
      
      if (error.message.includes('Timeout') || error.message.includes('timeout')) {
        return {
          error: 'Request timeout',
          message: `The request took longer than ${timeout}ms`,
          partial: true
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Gather data from MCP servers
   */
  async gatherData(query, brand = null) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const results = {};
    
    // Determine which servers to query
    const queryPatterns = {
      jira: /jira|issue|ticket|sprint|backlog|epic|story/i,
      confluence: /confluence|doc|documentation|prd|spec|wiki/i,
      googleDrive: /drive|google|document|sheet|file|folder/i,
      both: /project|status|update|progress/i
    };
    
    // Check Atlassian
    if ((queryPatterns.jira.test(query) || 
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
    if ((queryPatterns.googleDrive.test(query) || 
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
   * Get available tools
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
   */
  isServerAvailable(serverName) {
    return this.servers.has(serverName);
  }
  
  /**
   * Perform health check
   */
  async healthCheck() {
    const health = {};
    
    for (const [key, config] of Object.entries(this.serverConfigs)) {
      if (!config.enabled) continue;
      
      try {
        const server = await this.getConnection(key);
        const start = Date.now();
        
        await Promise.race([
          server.client.listTools(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 3000)
          )
        ]);
        
        health[key] = {
          status: 'healthy',
          responseTime: Date.now() - start,
          name: config.name
        };
      } catch (error) {
        health[key] = {
          status: 'unhealthy',
          error: error.message,
          name: config.name
        };
      }
    }
    
    return health;
  }
  
  /**
   * Get status
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
    this.connectionPool.clear();
    this.initialized = false;
  }
}
