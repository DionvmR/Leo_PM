# Leo Agent - API Key Setup Guide

## 🔐 Setting Up Your OpenAI API Key

### Step 1: Get Your OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in to your OpenAI account (or create one)
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-...`)

### Step 2: Add Your API Key to Leo
1. In the `leo-agent` directory, create a `.env` file:
   ```bash
   cd leo-agent
   cp .env.example .env
   ```

2. Open the `.env` file in a text editor and replace the placeholder:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### Step 3: Verify It Works
```bash
npm test
```

This will test your OpenAI connection and confirm everything is working!

## 💰 OpenAI Pricing Notes
- GPT-4 Turbo: ~$0.01 per 1K input tokens, $0.03 per 1K output tokens
- GPT-3.5 Turbo: ~$0.0005 per 1K input tokens, $0.0015 per 1K output tokens
- New accounts often get free credits to start

## 🔒 Security Tips
- Never commit your `.env` file to git (it's already in .gitignore)
- Never share your API key publicly
- Rotate your keys regularly via the OpenAI dashboard
- Set usage limits in your OpenAI account to prevent unexpected charges

## 🚀 Ready to Go!
Once your API key is set up, run:
```bash
npm start
```

And start chatting with Leo!
