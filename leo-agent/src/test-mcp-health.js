/**
 * Test MCP health check and timeout improvements
 */

import dotenv from 'dotenv';
import { MCPManager } from './mcp-manager.js';

dotenv.config();

async function testMCPHealth() {
  console.log('=== MCP Health Check Test ===\n');
  
  const mcpManager = new MCPManager();
  
  try {
    // Initialize servers
    console.log('Initializing MCP servers...');
    await mcpManager.initialize();
    console.log('\n');
    
    // Get server status
    console.log('Server Status:');
    const status = mcpManager.getStatus();
    console.log(JSON.stringify(status, null, 2));
    console.log('\n');
    
    // Perform health check
    console.log('Running health check...');
    const health = await mcpManager.healthCheck();
    console.log('Health Check Results:');
    console.log(JSON.stringify(health, null, 2));
    console.log('\n');
    
    // Test simple queries with timeouts
    console.log('Testing queries with progressive strategy...\n');
    
    // Test Jira query
    if (mcpManager.isServerAvailable('atlassian')) {
      console.log('Testing Jira query...');
      const startJira = Date.now();
      const jiraResults = await mcpManager.queryAtlassian('Show me recent Jira issues', 'TrueFire');
      const jiraTime = Date.now() - startJira;
      
      if (jiraResults.jira) {
        if (jiraResults.jira.error) {
          console.log(`Jira query failed: ${jiraResults.jira.error}`);
          if (jiraResults.jira.suggestion) {
            console.log(`Suggestion: ${jiraResults.jira.suggestion}`);
          }
        } else {
          console.log(`Jira query succeeded in ${jiraTime}ms`);
          console.log(`Results: ${JSON.stringify(jiraResults.jira).substring(0, 200)}...`);
        }
      }
      console.log('\n');
      
      // Test Confluence query
      console.log('Testing Confluence query...');
      const startConf = Date.now();
      const confResults = await mcpManager.queryAtlassian('Find TF 1.25 documentation', 'TrueFire');
      const confTime = Date.now() - startConf;
      
      if (confResults.confluence) {
        if (confResults.confluence.error) {
          console.log(`Confluence query failed: ${confResults.confluence.error}`);
          if (confResults.confluence.suggestion) {
            console.log(`Suggestion: ${confResults.confluence.suggestion}`);
          }
        } else {
          console.log(`Confluence query succeeded in ${confTime}ms`);
          console.log(`Results: ${JSON.stringify(confResults.confluence).substring(0, 200)}...`);
        }
      }
      console.log('\n');
    }
    
    // Test Google Drive query
    if (mcpManager.isServerAvailable('googleDrive')) {
      console.log('Testing Google Drive query...');
      const startDrive = Date.now();
      const driveResults = await mcpManager.queryGoogleDrive('TrueFire documents', 'TrueFire');
      const driveTime = Date.now() - startDrive;
      
      if (driveResults.error) {
        console.log(`Google Drive query failed: ${driveResults.error}`);
        if (driveResults.suggestion) {
          console.log(`Suggestion: ${driveResults.suggestion}`);
        }
      } else {
        console.log(`Google Drive query succeeded in ${driveTime}ms`);
        console.log(`Results: ${JSON.stringify(driveResults).substring(0, 200)}...`);
      }
      console.log('\n');
    }
    
    // Test timeout handling
    console.log('Testing timeout handling with complex query...');
    const complexQuery = 'Find all PRDs and documentation for TrueFire 1.25 release including Jira tickets and Google Drive files';
    const startComplex = Date.now();
    const complexResults = await mcpManager.gatherData(complexQuery, 'TrueFire');
    const complexTime = Date.now() - startComplex;
    
    console.log(`Complex query completed in ${complexTime}ms`);
    
    // Check for timeouts or errors
    let hasTimeouts = false;
    for (const [server, result] of Object.entries(complexResults)) {
      if (result && result.error && result.error.includes('timeout')) {
        hasTimeouts = true;
        console.log(`- ${server}: TIMEOUT - ${result.error}`);
      } else if (result && result.error) {
        console.log(`- ${server}: ERROR - ${result.error}`);
      } else {
        console.log(`- ${server}: SUCCESS`);
      }
    }
    
    if (hasTimeouts) {
      console.log('\nTimeout issues detected. The progressive query strategy should help minimize these.');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Disconnect
    console.log('\nDisconnecting from servers...');
    await mcpManager.disconnect();
    console.log('Test complete.');
  }
}

// Run the test
testMCPHealth().catch(console.error);
