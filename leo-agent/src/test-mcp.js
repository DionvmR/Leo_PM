/**
 * Test MCP Server Connections
 * Run this to verify your MCP servers are properly configured
 */

import { MCPManager } from './mcp-manager.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testMCPServers() {
  console.log('=== Testing MCP Server Connections ===\n');
  
  const mcpManager = new MCPManager();
  
  try {
    // Initialize all servers
    await mcpManager.initialize();
    
    console.log('\n=== MCP Server Status ===');
    const status = mcpManager.getStatus();
    
    Object.entries(status).forEach(([key, info]) => {
      console.log(`\n${info.name}:`);
      console.log(`  Status: ${info.available ? '✅ Connected' : '❌ Not Connected'}`);
      console.log(`  Enabled: ${info.enabled ? 'Yes' : 'No'}`);
      console.log(`  Available Tools: ${info.tools}`);
    });
    
    // Get detailed tool list
    console.log('\n=== Available Tools by Server ===');
    const tools = await mcpManager.getAvailableTools();
    
    Object.entries(tools).forEach(([server, serverTools]) => {
      console.log(`\n${server}:`);
      if (serverTools.length === 0) {
        console.log('  ⚠️  No tools available - check credentials!');
      } else {
        serverTools.forEach(tool => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });
      }
    });
    
    // Test a simple Confluence search if Atlassian is connected
    if (mcpManager.isServerAvailable('atlassian') && status.atlassian.tools > 0) {
      console.log('\n=== Testing Confluence Search ===');
      try {
        const result = await mcpManager.callToolWithTimeout('atlassian', 'confluence_search', {
          query: 'type=page AND space=PO AND lastmodified > now("-1d")',
          limit: 1
        }, 5000);
        
        if (result.error) {
          console.log('Search returned error:', result.error);
        } else {
          console.log('✅ Confluence search successful!');
          console.log('Results found:', result.results ? result.results.length : 0);
        }
      } catch (error) {
        console.log('❌ Confluence search failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Disconnect all servers
    await mcpManager.disconnect();
    console.log('\n=== Test Complete ===');
  }
}

// Run the test
testMCPServers().catch(console.error);
