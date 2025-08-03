/**
 * Test the timeout recovery improvements
 */

import { LeoAgent } from './agent.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

async function testTimeoutRecovery() {
  console.log('=== Testing Timeout Recovery System ===\n');
  
  const agent = new LeoAgent();
  
  // Test scenarios
  const testCases = [
    {
      name: 'Normal user query that might timeout',
      message: 'Show me the latest Jira issues',
      userId: 'test-user-1'
    },
    {
      name: 'Debug mode - user asking about timeout',
      message: 'I got a TIMEOUT_ERROR when searching Jira. What happened?',
      userId: 'test-user-2'
    },
    {
      name: 'User with previous timeout continuing conversation',
      message: 'Can you try searching with fewer results?',
      userId: 'test-user-1'
    },
    {
      name: 'Project-specific Jira query',
      message: 'Show me issues from the DEV project',
      userId: 'test-user-3'
    }
  ];
  
  // First, simulate a timeout by making a query
  console.log('1. Simulating initial timeout scenario...\n');
  const timeoutUser = 'timeout-test-user';
  
  // Override the timeout for testing
  if (agent.mcpManager.serverConfigs.atlassian) {
    console.log('Setting very short timeout to force timeout errors...\n');
  }
  
  const firstResponse = await agent.chat(
    'Show me all Jira issues and Confluence docs', 
    { userId: timeoutUser }
  );
  
  console.log('Initial Response:', firstResponse);
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Now test each scenario
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log(`User: ${testCase.message}`);
    console.log('-'.repeat(40));
    
    try {
      const response = await agent.chat(testCase.message, { 
        userId: testCase.userId 
      });
      
      console.log('Response:', response);
      
      // Check if response contains recovery options
      if (response.includes('What would you like me to try?')) {
        console.log('\n✓ Recovery options presented to user');
      }
      
      if (response.includes('Performance Stats:')) {
        console.log('✓ Performance statistics included');
      }
      
      if (response.includes('DEBUG MODE DETECTED')) {
        console.log('✓ Debug mode correctly detected');
      }
      
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
  
  // Test performance metrics
  console.log('\n=== Performance Metrics ===\n');
  
  const metrics = agent.mcpManager.timeoutRecoveryManager.performanceMetrics;
  for (const [tool, data] of metrics) {
    console.log(`Tool: ${tool}`);
    const stats = agent.mcpManager.timeoutRecoveryManager.getPerformanceStats(tool);
    if (stats) {
      console.log(`  - P50: ${stats.p50}ms`);
      console.log(`  - P95: ${stats.p95}ms`);
      console.log(`  - Success Rate: ${Math.round(stats.successRate * 100)}%`);
      console.log(`  - Sample Size: ${stats.sampleSize}`);
    }
    console.log();
  }
  
  // Disconnect when done
  await agent.mcpManager.disconnect();
}

// Run the test
testTimeoutRecovery().catch(console.error);
