/**
 * Debug script for MCP timeout issues
 */

import dotenv from 'dotenv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

dotenv.config();

async function testDirectConnection() {
  console.log('=== Direct MCP Connection Test ===\n');
  
  // Test Atlassian connection
  console.log('Testing Atlassian MCP server...');
  await testServer({
    name: 'Atlassian',
    command: '/Users/dionvm/Documents/Cline/MCP/mcp-atlassian/venv/bin/mcp-atlassian',
    args: [],
    env: {
      CONFLUENCE_URL: process.env.CONFLUENCE_URL || 'https://truefirestudios.atlassian.net/wiki',
      CONFLUENCE_USERNAME: process.env.CONFLUENCE_USERNAME || process.env.JIRA_USERNAME,
      CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_API_TOKEN || process.env.JIRA_API_TOKEN,
      JIRA_URL: process.env.JIRA_URL || 'https://truefirestudios.atlassian.net',
      JIRA_USERNAME: process.env.JIRA_USERNAME,
      JIRA_API_TOKEN: process.env.JIRA_API_TOKEN
    }
  });
  
  // Test Google Drive connection
  console.log('\nTesting Google Drive MCP server...');
  await testServer({
    name: 'Google Drive',
    command: 'npx',
    args: ['-y', '@chinchillaenterprises/mcp-google-drive'],
    env: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN
    }
  });
}

async function testServer(config) {
  const stages = [];
  let transport, client;
  
  try {
    // Stage 1: Create transport
    const stage1Start = Date.now();
    console.log(`\n[${config.name}] Creating transport...`);
    
    const mergedEnv = {
      ...process.env,
      ...(config.env || {})
    };
    
    transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: mergedEnv
    });
    
    // The process might not be immediately available
    let processStarted = false;
    let stderrOutput = '';
    
    // Wait a bit for the transport to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Add process monitoring if process is available
    if (transport.process) {
      transport.process.on('spawn', () => {
        processStarted = true;
        console.log(`[${config.name}] Process spawned`);
      });
      
      transport.process.on('error', (error) => {
        console.error(`[${config.name}] Process error:`, error);
      });
      
      if (transport.process.stderr) {
        transport.process.stderr.on('data', (data) => {
          stderrOutput += data.toString();
        });
      }
    } else {
      console.log(`[${config.name}] Transport process not immediately available`);
    }
    
    stages.push({ name: 'Transport creation', duration: Date.now() - stage1Start });
    
    // Stage 2: Create client
    const stage2Start = Date.now();
    console.log(`[${config.name}] Creating client...`);
    
    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
    
    // Try to set various timeout configurations
    if (client._protocol) {
      client._protocol.timeout = 10000; // 10 seconds
      console.log(`[${config.name}] Set protocol timeout to 10s`);
    }
    
    stages.push({ name: 'Client creation', duration: Date.now() - stage2Start });
    
    // Stage 3: Connect with timeout
    const stage3Start = Date.now();
    console.log(`[${config.name}] Connecting...`);
    
    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    stages.push({ name: 'Connection', duration: Date.now() - stage3Start });
    console.log(`[${config.name}] Connected successfully`);
    
    // Stage 4: List tools
    const stage4Start = Date.now();
    console.log(`[${config.name}] Listing tools...`);
    
    const toolsPromise = client.listTools();
    const toolsTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('List tools timeout after 5s')), 5000)
    );
    
    const tools = await Promise.race([toolsPromise, toolsTimeoutPromise]);
    
    stages.push({ name: 'List tools', duration: Date.now() - stage4Start });
    console.log(`[${config.name}] Found ${tools.tools.length} tools`);
    
    // Stage 5: Test a simple tool call (if available)
    if (tools.tools.length > 0 && config.name === 'Atlassian') {
      const stage5Start = Date.now();
      console.log(`[${config.name}] Testing tool call...`);
      
      try {
        const toolPromise = client.callTool('jira_search', {
          jql: 'ORDER BY created DESC',
          limit: 1
        });
        
        const toolTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tool call timeout after 10s')), 10000)
        );
        
        const result = await Promise.race([toolPromise, toolTimeoutPromise]);
        stages.push({ name: 'Tool call', duration: Date.now() - stage5Start });
        console.log(`[${config.name}] Tool call successful`);
      } catch (error) {
        stages.push({ name: 'Tool call', duration: Date.now() - stage5Start, error: error.message });
        console.error(`[${config.name}] Tool call failed:`, error.message);
      }
    }
    
    // Print summary
    console.log(`\n[${config.name}] Performance Summary:`);
    let totalDuration = 0;
    stages.forEach(stage => {
      totalDuration += stage.duration;
      console.log(`  ${stage.name}: ${stage.duration}ms${stage.error ? ' (FAILED: ' + stage.error + ')' : ''}`);
    });
    console.log(`  Total: ${totalDuration}ms`);
    
    if (stderrOutput) {
      console.log(`\n[${config.name}] stderr output:`);
      console.log(stderrOutput);
    }
    
  } catch (error) {
    console.error(`\n[${config.name}] FAILED:`, error.message);
    console.error(`Full error:`, error);
    
    // Print partial timing info
    if (stages.length > 0) {
      console.log(`\n[${config.name}] Partial timing:`);
      stages.forEach(stage => {
        console.log(`  ${stage.name}: ${stage.duration}ms`);
      });
    }
  } finally {
    // Cleanup
    if (client) {
      try {
        await client.close();
        console.log(`[${config.name}] Client closed`);
      } catch (e) {
        console.error(`[${config.name}] Error closing client:`, e.message);
      }
    }
  }
}

// Run the test
testDirectConnection().catch(console.error);
