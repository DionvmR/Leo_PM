/**
 * Test script for permission-based MCP access
 */

import dotenv from 'dotenv';
import { LeoAgent } from './agent-permission-based.js';

dotenv.config();

async function testPermissionBased() {
  console.log('=== Testing Permission-Based MCP Access ===\n');
  
  const agent = new LeoAgent();
  const userId = 'test-user';
  
  // Test 1: Message that triggers MCP intent
  console.log('Test 1: Asking about Google Drive documents');
  console.log('User: "Can you find TrueFire 1.25 documents in my drive?"');
  
  let response = await agent.chat(
    "Can you find TrueFire 1.25 documents in my drive?",
    { userId }
  );
  
  console.log('Leo:', response);
  console.log('\n---\n');
  
  // Test 2: User confirms
  console.log('Test 2: User confirms search');
  console.log('User: "Yes, please search"');
  
  response = await agent.chat(
    "Yes, please search",
    { userId }
  );
  
  console.log('Leo:', response);
  console.log('\n---\n');
  
  // Test 3: New query with denial
  console.log('Test 3: Asking about Jira issues');
  console.log('User: "What are the latest Jira tickets?"');
  
  response = await agent.chat(
    "What are the latest Jira tickets?",
    { userId }
  );
  
  console.log('Leo:', response);
  console.log('\n---\n');
  
  // Test 4: User denies
  console.log('Test 4: User denies search');
  console.log('User: "No, never mind"');
  
  response = await agent.chat(
    "No, never mind",
    { userId }
  );
  
  console.log('Leo:', response);
  console.log('\n---\n');
  
  // Test 5: Normal conversation without MCP
  console.log('Test 5: Normal question without MCP triggers');
  console.log('User: "What is the best way to manage a product roadmap?"');
  
  response = await agent.chat(
    "What is the best way to manage a product roadmap?",
    { userId }
  );
  
  console.log('Leo:', response);
  
  // Cleanup
  await agent.mcpManager.disconnect();
}

// Run the test
testPermissionBased().catch(console.error);
