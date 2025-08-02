# Setting up Claude (Anthropic) with Leo

Leo now supports Claude models from Anthropic! Here's how to set it up and switch between OpenAI and Claude.

## 🔑 Getting Your Claude API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in to your Anthropic account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-ant-...`)

## 📝 Adding Your Claude API Key

1. Edit your `.env` file in the `leo-agent` directory
2. Replace the placeholder with your actual key:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   ```

## 🔄 Switching Between Providers

### Method 1: Using Environment Variables
Uncomment and set in your `.env` file:
```
LLM_PROVIDER=claude
LLM_MODEL=claude-3-sonnet
```

### Method 2: Using Config File
Create/edit `config/settings.json`:
```json
{
  "llm": {
    "provider": "claude",
    "model": "claude-3-sonnet"
  }
}
```

### Method 3: Programmatically
Leo can switch providers on the fly:
```javascript
// In your code
await llmManager.switchProvider('claude', {
  model: 'claude-3-sonnet'
});
```

## 📊 Available Claude Models

- **claude-3-opus**: Most capable, best for complex tasks
- **claude-3-sonnet**: Balanced performance and cost (recommended)
- **claude-3-haiku**: Fastest and most affordable
- **claude-2.1**: Previous generation, still capable

## 💰 Pricing Comparison

### Claude Pricing (per million tokens)
- **Opus**: $15 input / $75 output
- **Sonnet**: $3 input / $15 output
- **Haiku**: $0.25 input / $1.25 output

### OpenAI Pricing (per million tokens)
- **GPT-4o**: $5 input / $15 output
- **GPT-3.5 Turbo**: $0.5 input / $1.5 output

## 🧪 Testing Claude Connection

1. Make sure your Claude API key is in `.env`
2. Edit the test to use Claude:
   ```bash
   cd leo-agent
   LLM_PROVIDER=claude npm test
   ```

## 🎯 When to Use Each Model

### Use Claude when you need:
- Excellent reasoning and analysis
- Creative writing
- Detailed explanations
- Strong safety guardrails

### Use OpenAI when you need:
- Function calling capabilities
- Broader ecosystem support
- Lower cost (GPT-3.5)
- Specific GPT-4 features

## 🚀 Quick Start

1. Add your Claude API key to `.env`
2. Set `LLM_PROVIDER=claude` in `.env`
3. Run `npm start` to chat with Leo using Claude!

## 📝 Example .env Configuration

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-openai-key

# Claude Configuration
ANTHROPIC_API_KEY=sk-ant-your-claude-key

# Use Claude as the default provider
LLM_PROVIDER=claude
LLM_MODEL=claude-3-sonnet
```

## 🔧 Troubleshooting

### "Invalid Anthropic API key"
- Verify your key starts with `sk-ant-`
- Check for extra spaces or quotes
- Ensure your key has not been revoked

### "Rate limit exceeded"
- Claude has different rate limits than OpenAI
- Wait a few minutes and try again
- Consider upgrading your Anthropic plan

### "Model not found"
- Use the exact model names listed above
- The LLM Manager automatically maps to full model versions
