# OpenAI Quota Exceeded - How to Fix

## What's Happening?
Your OpenAI API key is working correctly! However, you've exceeded your usage quota. This typically means one of:
- Your free trial credits have been used up
- You haven't set up billing on your OpenAI account
- You've hit your monthly spending limit

## How to Fix It

### Option 1: Add Billing to Your OpenAI Account (Recommended)
1. Go to https://platform.openai.com/account/billing
2. Click "Add payment method"
3. Add a credit card
4. Set a monthly spending limit (start with $5-10 for testing)

### Option 2: Use GPT-3.5 Turbo (Already Configured)
I've already switched Leo to use `gpt-3.5-turbo` which is:
- 10x cheaper than GPT-4
- Still very capable for most tasks
- Costs about $0.002 per 1,000 tokens

## Cost Estimates
For typical usage with Leo:
- **GPT-3.5 Turbo**: ~$0.50-2.00/month
- **GPT-4o**: ~$5-20/month
- **GPT-4o-mini**: ~$1-5/month

## Testing Leo Without Credits
Unfortunately, you need active OpenAI credits to use Leo. Once you add billing:
1. Run `npm test` to verify connection
2. Run `npm start` to begin chatting

## Switching Models Later
After adding credits, you can switch models by editing `config/settings.json`:
```json
{
  "llm": {
    "model": "gpt-4o"  // or "gpt-3.5-turbo", "gpt-4o-mini"
  }
}
