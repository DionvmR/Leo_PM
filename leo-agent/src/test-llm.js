#!/usr/bin/env node

/**
 * Test LLM Connection
 * Simple script to verify OpenAI connection is working
 */

import { LLMManager } from './llm-manager.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log(chalk.blue.bold('\n=== Leo Agent - LLM Connection Test ===\n'));

async function testLLMConnection() {
  const llmManager = new LLMManager();
  
  // Show current configuration
  const info = llmManager.getProviderInfo();
  console.log(chalk.yellow('Current LLM Configuration:'));
  console.log(`- Provider: ${info.provider}`);
  console.log(`- Model: ${info.model}`);
  console.log(`- Max Tokens: ${info.maxTokens}`);
  console.log(`- Temperature: ${info.temperature}`);
  console.log(`- API Key Present: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}\n`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.error(chalk.red('❌ Error: OPENAI_API_KEY not found in environment variables'));
    console.log(chalk.yellow('\nPlease:'));
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your OpenAI API key to the .env file');
    console.log('3. Run this test again\n');
    process.exit(1);
  }
  
  console.log(chalk.cyan('Testing connection...'));
  
  try {
    // Test basic connection
    const testWorking = await llmManager.testConnection();
    if (testWorking) {
      console.log(chalk.green('✅ Basic connection test passed!\n'));
    } else {
      console.log(chalk.red('❌ Basic connection test failed\n'));
      process.exit(1);
    }
    
    // Test a Leo-style response
    console.log(chalk.cyan('Testing Leo-style response...'));
    const response = await llmManager.generateResponse([
      {
        role: 'system',
        content: 'You are Leo, an AI Product Manager assistant for TrueFire Studios. Be helpful and analytical.'
      },
      {
        role: 'user',
        content: 'Hello Leo! Can you briefly introduce yourself and mention the 5 brands you support?'
      }
    ]);
    
    console.log(chalk.green('\n✅ Leo Response:'));
    console.log(chalk.white(response));
    
    // Show available models
    console.log(chalk.yellow('\n\nAvailable Models:'));
    const models = llmManager.getAvailableModels();
    models.forEach(model => console.log(`- ${model}`));
    
    console.log(chalk.green.bold('\n✅ All tests passed! Leo is ready to chat.\n'));
    console.log(chalk.blue('Run "npm start" to start the interactive CLI\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error during testing:'));
    console.error(chalk.red(error.message));
    
    if (error.message.includes('API key')) {
      console.log(chalk.yellow('\nPlease check your OpenAI API key in the .env file'));
    } else if (error.message.includes('Rate limit')) {
      console.log(chalk.yellow('\nYour API key has hit rate limits. Please wait and try again.'));
    }
    
    process.exit(1);
  }
}

// Run the test
testLLMConnection();
