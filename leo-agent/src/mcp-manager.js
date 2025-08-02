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
        enabled: true
      },
      googleDrive: {
        command: 'npx',
        args: ['-y', '@chinchillaenterprises/mcp-google-drive'],
        name: 'Google Drive',
        enabled: true
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
    
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env }
    });
    
    const client = new Client({
      name: `leo-agent-${key}`,
      version: '1.0.0'
    }, {
      capabilities: {}
    });
    
    await client.connect(transport);
    
    // List available tools
    const tools = await client.listTools();
    console.log(`${config.name} connected with ${tools.tools.length} tools available`);
    
    this.servers.set(key, {
      client,
      config,
      tools: tools.tools
    });
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
   * Query Atlassian (Jira/Confluence) servers
   */
  async queryAtlassian(query, brand) {
    const server = this.servers.get('atlassian');
    if (!server) return null;
    
    const results = {};
    
    // Search Jira if query mentions issues/tickets
    if (/jira|issue|ticket|sprint|bug|task/i.test(query)) {
      try {
        // Build JQL query
        let jql = '';
        if (brand) {
          // Add brand-specific project filter if applicable
          const brandProjects = {
            'TrueFire': ['TF', 'TDM', 'TFH'],
            'ArtistWorks': ['ADM', 'AUP'],
            'Blayze': ['BLZ'],
            'FaderPro': ['FDP'],
            'JamPlay': ['JP']
          };
          
          const projects = brandProjects[brand];
          if (projects) {
            jql = `project in (${projects.join(',')}) AND `;
          }
        }
        
        // Add time-based filters
        if (/this week|current week/i.test(query)) {
          jql += 'created >= -1w OR updated >= -1w';
        } else if (/this month|current month/i.test(query)) {
          jql += 'created >= -4w OR updated >= -4w';
        } else {
          jql += 'updated >= -2w ORDER BY priority DESC, updated DESC';
        }
        
        const jiraResult = await this.callToolWithTimeout('atlassian', 'jira_search', {
          jql,
          limit: 10
        }, 30000); // 30 second timeout
        
        results.jira = jiraResult;
      } catch (error) {
        console.error('Jira search error:', error);
        results.jira = { error: error.message };
      }
    }
    
    // Search Confluence if query mentions docs/PRDs
    if (/confluence|doc|prd|spec|wiki/i.test(query)) {
      try {
        // Build more specific CQL query
        let cql = 'type=page';
        
        // Add specific space filters for known spaces
        const knownSpaces = ['PO', 'DEV', 'TCI', 'TMI'];
        if (brand) {
          // Map brands to specific spaces if applicable
          const brandSpaces = {
            'TrueFire': ['PO', 'TCI'],
            'ArtistWorks': ['PO'],
            'Blayze': ['PO'],
            'FaderPro': ['PO'],
            'JamPlay': ['PO']
          };
          
          const spaces = brandSpaces[brand];
          if (spaces && spaces.length > 0) {
            cql += ` AND space in (${spaces.join(',')})`;
          } else {
            cql += ` AND text ~ "${brand}"`;
          }
        } else {
          // Limit to known spaces when no brand specified
          cql += ` AND space in (${knownSpaces.join(',')})`;
        }
        
        // More restrictive time filter
        cql += ' AND lastmodified > now("-2w")';
        
        // Add order by to get most recent first
        cql += ' ORDER BY lastmodified DESC';
        
        console.log('Confluence CQL query:', cql);
        
        const confluenceResult = await this.callToolWithTimeout('atlassian', 'confluence_search', {
          query: cql,
          limit: 3 // Reduced limit for faster response
        }, 15000); // 15 second timeout
        
        results.confluence = confluenceResult;
      } catch (error) {
        console.error('Confluence search error:', error);
        results.confluence = { 
          error: error.message,
          suggestion: 'Try searching with more specific terms or a specific space'
        };
      }
    }
    
    return results;
  }
  
  /**
   * Query Google Drive
   */
  async queryGoogleDrive(query, brand) {
    const server = this.servers.get('googleDrive');
    if (!server) return null;
    
    try {
      let searchQuery = '';
      
      // Add brand to search if specified
      if (brand) {
        searchQuery = `"${brand}" `;
      }
      
      // Extract search terms from query
      const searchTerms = query.match(/["']([^"']+)["']|(\w+)/g);
      if (searchTerms) {
        searchQuery += searchTerms.join(' ');
      }
      
      const result = await server.client.callTool('drive_search_files', {
        query: searchQuery,
        pageSize: 10
      });
      
      return result.content[0];
    } catch (error) {
      console.error('Google Drive search error:', error);
      return null;
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
      const result = await server.client.callTool(toolName, params);
      return result.content[0];
    } catch (error) {
      console.error(`Error calling tool ${toolName} on ${serverKey}:`, error);
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
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool ${toolName} timed out after ${timeout}ms`));
      }, timeout);
    });
    
    try {
      return await Promise.race([
        this.callTool(serverKey, toolName, params),
        timeoutPromise
      ]);
    } catch (error) {
      if (error.message.includes('timed out')) {
        console.warn(`${toolName} timed out, returning partial results`);
        return {
          error: 'Search timed out',
          message: 'The search took too long. Try using more specific search terms.',
          partial: true
        };
      }
      throw error;
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
