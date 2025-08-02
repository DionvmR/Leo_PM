# Leo Agent - AI Product Manager for TrueFire Studios

Leo is an AI-powered Product Manager assistant designed to help the TrueFire Studios team manage projects across their 5 brands: TrueFire, ArtistWorks, Blayze, FaderPro, and JamPlay.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- OpenAI API key

### Setup Instructions

1. **Clone the repository** (if not already done):
   ```bash
   cd leo-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your OpenAI API key**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your-actual-api-key-here
   ```

4. **Test the LLM connection**:
   ```bash
   npm test
   ```

5. **Start Leo**:
   ```bash
   npm start
   ```

## 🧪 Testing

### Test LLM Connection
```bash
npm test
```
This verifies your OpenAI connection is working properly.

### Test Brand Detection
```bash
npm run test:brands
```
This verifies Leo can correctly identify which brand you're asking about.

## 💬 Using Leo

Once started, Leo will present an interactive CLI where you can ask questions:

```
You: What are the top issues for TrueFire this week?

Leo: I'll analyze the top issues for TrueFire this week. Let me check the data...
[Leo provides detailed analysis]
```

### Example Questions

- "What are the top customer complaints for TrueFire this month?"
- "Show me the sprint progress for ArtistWorks"
- "What features are customers requesting for Blayze?"
- "How is the DJ course performance on FaderPro?"
- "Check JamPlay's subscription metrics"

## 🏗️ Architecture

Leo is built with a modular architecture:

- **LLM Manager**: Handles OpenAI and Claude connections (expandable to other providers)
- **Brand Detector**: Identifies which brand context to use
- **Prompt Manager**: Manages system prompts and brand-specific contexts
- **MCP Manager**: (Future) Connects to data sources via Model Context Protocol
- **Config Manager**: Handles all configuration settings

## 🔧 Configuration

Configuration is stored in `config/settings.json` (auto-created on first run).

### Available Settings

- **LLM Provider**: Currently supports OpenAI, with architecture for Claude and local models
- **Model Selection**: Choose between GPT-4, GPT-3.5, etc.
- **Temperature**: Control response creativity (0.0-1.0)
- **Max Tokens**: Limit response length

## 🚦 Current Status

### ✅ Implemented
- OpenAI LLM integration
- Brand detection for all 5 brands
- Conversation history management
- Interactive CLI interface
- Configuration management
- Test suites

### 🔄 In Progress
- MCP server connections (stub implementation ready)
- Slack bot integration
- Data source integrations

### 📋 Planned
- Confluence integration for PRDs
- JIRA integration for sprint tracking
- Intercom integration for customer feedback
- Google Drive integration for documents
- GitHub integration for technical context

## 🔄 Switching LLM Models

Leo supports multiple OpenAI models. To switch:

1. Edit `config/settings.json` (created after first run)
2. Change the `llm.model` setting:
   ```json
   {
     "llm": {
       "model": "gpt-3.5-turbo"  // or "gpt-4", "gpt-4-turbo-preview"
     }
   }
   ```

## 🐛 Troubleshooting

### "OPENAI_API_KEY not found"
- Make sure you've created a `.env` file (not `.env.example`)
- Verify your API key is correctly added to the `.env` file

### "Invalid API key"
- Check your OpenAI API key is valid
- Ensure you have credits/billing set up on OpenAI

### "Rate limit exceeded"
- Your API key has hit rate limits
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan

## 📝 Development

### Running in Development Mode
```bash
npm run dev
```
This uses Node's `--watch` flag for auto-reloading during development.

### Project Structure
```
leo-agent/
├── src/
│   ├── index.js          # CLI entry point
│   ├── agent.js          # Core Leo logic
│   ├── llm-manager.js    # LLM connections
│   ├── brand-detector.js # Brand identification
│   ├── prompt-manager.js # Prompt management
│   ├── mcp-manager.js    # MCP connections (stub)
│   └── config.js         # Configuration
├── config/               # Configuration files
├── prompts/              # System and brand prompts
├── .env                  # Environment variables (create from .env.example)
└── package.json          # Dependencies
```

## 🤝 Contributing

This project is designed to be built entirely by AI using Cursor/Cline. When making changes:

1. Keep code modular and well-documented
2. Test all changes thoroughly
3. Update this README if adding new features
4. Follow the existing code patterns

## 📄 License

ISC License - TrueFire Studios
