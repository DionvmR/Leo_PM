#!/usr/bin/env node

/**
 * Test Brand Detection
 * Verify brand detection is working correctly
 */

import { BrandDetector } from './brand-detector.js';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n=== Leo Agent - Brand Detection Test ===\n'));

const brandDetector = new BrandDetector();

// Test cases
const testCases = [
  { message: "What's happening with TrueFire's mobile app?", expected: "TrueFire" },
  { message: "Show me the latest issues for ArtistWorks video exchange", expected: "ArtistWorks" },
  { message: "How is Blayze racing content performing?", expected: "Blayze" },
  { message: "FaderPro DJ courses need updating", expected: "FaderPro" },
  { message: "Check JamPlay subscription numbers", expected: "JamPlay" },
  { message: "What are our top priorities this sprint?", expected: null },
  { message: "The guitar lessons on TF are great", expected: "TrueFire" },
  { message: "AW video exchange needs improvement", expected: "ArtistWorks" },
  { message: "Update the electronic music production courses on FP", expected: "FaderPro" },
  { message: "motorsports coaching on blayze.com", expected: "Blayze" }
];

console.log(chalk.yellow('Running brand detection tests...\n'));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const detected = brandDetector.detectFromText(test.message);
  const success = detected === test.expected;
  
  if (success) {
    console.log(chalk.green(`✅ Test ${index + 1}: PASSED`));
    passed++;
  } else {
    console.log(chalk.red(`❌ Test ${index + 1}: FAILED`));
    failed++;
  }
  
  console.log(`   Message: "${test.message}"`);
  console.log(`   Expected: ${test.expected || 'null'}`);
  console.log(`   Detected: ${detected || 'null'}\n`);
});

// Test conversation context
console.log(chalk.yellow('Testing conversation context...\n'));

const conversation = [
  { role: 'user', content: "I need help with TrueFire" },
  { role: 'assistant', content: "I'll help you with TrueFire. What specific aspect would you like to discuss?" },
  { role: 'user', content: "What are the top issues this week?" }
];

// Clear any previous context
brandDetector.clearContext();

// Test each message in sequence
for (let i = 0; i < conversation.length; i++) {
  const history = conversation.slice(0, i);
  const currentMessage = conversation[i].content;
  const detected = await brandDetector.detectBrand(currentMessage, history);
  
  console.log(`Message ${i + 1}: "${currentMessage}"`);
  console.log(`Detected brand: ${detected || 'null'}\n`);
}

// Summary
console.log(chalk.blue('\n=== Test Summary ==='));
console.log(chalk.green(`Passed: ${passed}`));
console.log(chalk.red(`Failed: ${failed}`));
console.log(chalk.yellow(`Total: ${testCases.length}`));

if (failed === 0) {
  console.log(chalk.green.bold('\n✅ All tests passed!'));
} else {
  console.log(chalk.red.bold('\n❌ Some tests failed. Please check the brand detection logic.'));
}

// Show all brands
console.log(chalk.yellow('\n\nSupported Brands:'));
brandDetector.getAllBrands().forEach(brand => console.log(`- ${brand}`));

console.log('\n');
