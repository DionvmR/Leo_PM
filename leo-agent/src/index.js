#!/usr/bin/env node

/**
 * Leo Agent - CLI Interface for Testing
 * This provides a command-line interface to interact with Leo during development
 */

import { LeoAgent } from './agent.js';
import readline from 'readline';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create readline interface for CLI interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.blue('You: ')
});

// Initialize Leo Agent
const leo = new LeoAgent();

// Welcome message
console.log(chalk.green.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                  Welcome to Leo - AI PM Agent                  ║
║              For TrueFire Studios (5 Brands)                   ║
║                                                                ║
║  Brands: TrueFire, ArtistWorks, Blayze, FaderPro, JamPlay    ║
╚═══════════════════════════════════════════════════════════════╝
`));

console.log(chalk.yellow('Initializing MCP connections...\n'));

// Initialize MCP servers
try {
  await leo.mcpManager.initialize();
  const status = leo.mcpManager.getStatus();
  
  console.log(chalk.cyan('MCP Server Status:'));
  for (const [key, info] of Object.entries(status)) {
    if (info.available) {
      console.log(chalk.green(`✓ ${info.name}: Connected (${info.tools} tools)`));
    } else if (info.enabled) {
      console.log(chalk.yellow(`⚠ ${info.name}: Failed to connect`));
    } else {
      console.log(chalk.gray(`- ${info.name}: Disabled`));
    }
  }
  console.log('');
} catch (error) {
  console.error(chalk.red('Warning: Failed to initialize MCP servers:'), error.message);
  console.log(chalk.yellow('Continuing without MCP integration...\n'));
}

console.log(chalk.yellow('Type your questions or "exit" to quit.\n'));

// Graceful shutdown handler
const shutdown = async () => {
  console.log(chalk.yellow('\n\nShutting down...'));
  await leo.mcpManager.disconnect();
  console.log(chalk.green('\nGoodbye! 👋\n'));
  process.exit(0);
};

// Handle Ctrl+C
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle user input
rl.prompt();

rl.on('line', async (input) => {
  const query = input.trim();
  
  if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
    console.log(chalk.green('\nGoodbye! 👋\n'));
    process.exit(0);
  }
  
  if (query) {
    console.log(chalk.cyan('\nLeo is thinking...\n'));
    
    try {
      const response = await leo.chat(query, {
        userId: 'cli-user',
        channel: 'cli'
      });
      
      console.log(chalk.green('Leo: ') + response + '\n');
    } catch (error) {
      console.error(chalk.red('Error: ') + error.message + '\n');
    }
  }
  
  rl.prompt();
});

rl.on('close', () => {
  console.log(chalk.green('\nGoodbye! 👋\n'));
  process.exit(0);
});
