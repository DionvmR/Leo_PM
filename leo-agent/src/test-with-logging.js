/**
 * Test MCP operations with detailed logging
 * This will generate log entries to analyze timeout patterns
 */

import dotenv from 'dotenv';
import { MCPManager } from './mcp-manager.js';
import { logger } from './logger.js';

dotenv.config();

async function testWithLogging() {
  console.log('=== MCP Operations Test with Detailed Logging ===\n');
  
  const mcpManager = new MCPManager();
  
  try {
    // Clear previous logs for clean test
    logger.clearLogs();
    logger.info('Starting MCP test with detailed logging');
    
    // Test 1: Initialize servers
    logger.info('TEST 1: Initializing MCP servers');
    await mcpManager.initialize();
    
    // Test 2: Health check
    logger.info('TEST 2: Running health check');
    const health = await mcpManager.healthCheck();
    logger.info('Health check completed', { health });
    
    // Test 3: Simple Jira query
    logger.info('TEST 3: Testing simple Jira query');
    const jiraResults = await mcpManager.queryAtlassian('Show me recent Jira issues', 'TrueFire');
    logger.info('Jira query completed', { 
      hasResults: !!jiraResults.jira,
      hasError: !!(jiraResults.jira && jiraResults.jira.error)
    });
    
    // Test 4: Confluence query
    logger.info('TEST 4: Testing Confluence query');
    const confResults = await mcpManager.queryAtlassian('Find TF 1.25 documentation', 'TrueFire');
    logger.info('Confluence query completed', {
      hasResults: !!confResults.confluence,
      hasError: !!(confResults.confluence && confResults.confluence.error)
    });
    
    // Test 5: Google Drive query
    logger.info('TEST 5: Testing Google Drive query');
    const driveResults = await mcpManager.queryGoogleDrive('TrueFire 1.25 documents', 'TrueFire');
    logger.info('Google Drive query completed', {
      hasResults: !!driveResults,
      hasError: !!driveResults.error
    });
    
    // Test 6: Complex query across all systems
    logger.info('TEST 6: Testing complex query across all systems');
    const complexResults = await mcpManager.gatherData(
      'Find all information about TrueFire 1.25 release including Jira tickets, documentation, and Google Drive files',
      'TrueFire'
    );
    logger.info('Complex query completed', {
      systems: Object.keys(complexResults),
      errors: Object.entries(complexResults)
        .filter(([_, result]) => result && result.error)
        .map(([system, _]) => system)
    });
    
    // Test 7: Stress test with multiple rapid queries
    logger.info('TEST 7: Stress test with rapid queries');
    const stressPromises = [];
    for (let i = 0; i < 3; i++) {
      stressPromises.push(
        mcpManager.queryAtlassian(`Test query ${i}`, 'TrueFire')
          .catch(error => ({ error: error.message }))
      );
    }
    
    const stressResults = await Promise.all(stressPromises);
    logger.info('Stress test completed', {
      totalQueries: stressPromises.length,
      successCount: stressResults.filter(r => !r.error).length,
      errorCount: stressResults.filter(r => r.error).length
    });
    
    // Generate log summary
    logger.info('Generating log summary...');
    const summary = await logger.getLogSummary();
    
    console.log('\n=== Log Summary ===');
    console.log(`Total log entries: ${summary.totalEntries}`);
    console.log('\nLog entries by level:');
    Object.entries(summary.byLevel).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`);
    });
    
    console.log('\nTimeout errors:');
    if (summary.timeouts.length === 0) {
      console.log('  No timeouts recorded');
    } else {
      summary.timeouts.forEach(timeout => {
        console.log(`  ${timeout.timestamp} - ${timeout.operation} (${timeout.timeout}ms)`);
      });
    }
    
    console.log('\nOperation statistics:');
    Object.entries(summary.operations).forEach(([op, stats]) => {
      console.log(`  ${op}:`);
      console.log(`    Total: ${stats.total}`);
      console.log(`    Success: ${stats.success}`);
      console.log(`    Failed: ${stats.failed}`);
      console.log(`    Timeouts: ${stats.timeouts}`);
    });
    
    console.log('\nAll errors:');
    if (summary.errors.length === 0) {
      console.log('  No errors recorded');
    } else {
      summary.errors.slice(0, 5).forEach(error => {
        console.log(`  ${error.timestamp} - ${error.message}`);
      });
      if (summary.errors.length > 5) {
        console.log(`  ... and ${summary.errors.length - 5} more errors`);
      }
    }
    
    console.log(`\nDetailed logs saved to: leo-agent/logs/mcp-operations.log`);
    
  } catch (error) {
    logger.critical('Test failed with critical error', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Disconnect
    logger.info('Disconnecting from all servers');
    await mcpManager.disconnect();
    logger.info('Test complete');
  }
}

// Run the test
testWithLogging().catch(error => {
  logger.critical('Unhandled error in test', {
    error: error.message,
    stack: error.stack
  });
  console.error(error);
});
