# Leo Agent - Master Project Plan

## Project Overview
Leo is an AI-powered Product Manager agent for TrueFire Studios that provides strategic product insights across five brands (TrueFire, ArtistWorks, Blayze, FaderPro, JamPlay). Built entirely by AI using Cursor/Cline, Leo will leverage MCP servers for integrations and be accessible via Slack.

## Architecture Overview

### Core Architecture
```
User → Slack → Leo Agent (Node.js) → MCP Servers → LLM → Response
                     ↓
            [Local Data Storage]
```

### Tech Stack (Optimized for AI Development)
- **Language**: Node.js (JavaScript)
- **Slack Integration**: Slack Bolt SDK
- **MCP Integration**: MCP client libraries
- **LLM**: OpenAI GPT-4 or Claude API
- **Database**: PostgreSQL (conversation history)
- **Deployment**: Railway or Vercel (simple one-click)

## Implementation Phases

### Phase 1: Local Agent Development (Days 1-4)
Build and test Leo locally before adding Slack integration.

#### Project Structure
```
leo-agent/
├── .env                      # API keys and configuration
├── package.json              # Dependencies
├── src/
│   ├── index.js             # CLI interface for testing
│   ├── agent.js             # Core Leo logic
│   ├── brand-detector.js    # Brand identification
│   ├── mcp-manager.js       # MCP server connections
│   └── prompt-manager.js    # Prompt loading and management
├── config/
│   ├── mcp-servers.json     # MCP server configurations
│   └── brands.json          # Brand-specific settings
├── prompts/
│   ├── system.md            # Master system prompt
│   └── brands/              # Brand-specific prompts
├── test/
│   └── test-queries.js      # Test conversations
└── README.md                # Setup instructions
```

#### Day 1: Setup & MCP Connections
1. Create project structure
2. Install MCP servers:
   - GitHub MCP
   - Google Drive MCP
   - Jira/Confluence MCP
   - Intercom MCP
3. Create basic CLI interface
4. Test MCP connections

#### Day 2: Core Agent Logic
1. Implement brand detection
2. Build MCP query routing
3. Create prompt management system
4. Add conversation context handling

#### Day 3: LLM Integration & Intelligence
1. Integrate OpenAI/Claude API
2. Implement response generation
3. Add data synthesis logic
4. Create PM analysis patterns

#### Day 4: Testing & Refinement
1. Test all integrations thoroughly
2. Create test suite with common queries
3. Refine prompts based on responses
4. Document setup process

### Phase 2: Slack Integration (Day 5)
Add Slack as a thin wrapper around the working agent.

#### Slack Bot Implementation
```javascript
// Minimal Slack wrapper (~100 lines)
const { App } = require('@slack/bolt');
const { LeoAgent } = require('./src/agent');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

const leo = new LeoAgent();

app.message(async ({ message, say }) => {
  const response = await leo.chat(message.text, {
    userId: message.user,
    channel: message.channel
  });
  await say(response);
});
```

#### Deployment Steps
1. Create Slack App at api.slack.com
2. Configure bot permissions
3. Deploy to Railway/Vercel
4. Test with team in private channel
5. Roll out to full workspace

## MCP Server Configuration

### Phase 1 MCP Servers
1. **Intercom** - Customer feedback and support tickets
2. **Google Drive** - Surveys, memos, documents
3. **Confluence** - PRDs and project documentation
4. **Jira** - Sprint tracking and task management
5. **GitHub** - Code repositories and technical feasibility

### MCP Benefits
- No custom integration code needed
- Standardized interface for all tools
- Built-in authentication handling
- Maintained by MCP community

## Key Features & Capabilities

### 1. Brand-Aware Responses
- Always confirms which brand before analysis
- Uses brand-specific data sources
- Maintains brand context in conversations

### 2. PM Analysis Patterns
- **Feature Prioritization**: Combines customer feedback + technical feasibility
- **Idea Evaluation**: Validates demand, assesses risk, suggests alternatives
- **Proactive Insights**: Surfaces risks and opportunities from data patterns
- **Cross-Source Validation**: Connects Intercom → Surveys → PRDs → Execution

### 3. Data-Driven Recommendations
- Cites specific metrics (ticket counts, survey percentages)
- Projects impact based on historical data
- Balances quick wins with strategic initiatives

## Success Metrics

### Technical Success
- [ ] All 5 MCP servers connected and functioning
- [ ] <2 second response time for queries
- [ ] 99% uptime for Slack bot
- [ ] Successful brand detection 95%+ of time

### Business Success
- [ ] Reduces PM research time by 80%
- [ ] Surfaces 5+ actionable insights per week
- [ ] Used by team daily within first month
- [ ] Positive feedback from all brands

## Development Guidelines

### For AI Development (Cursor/Cline)
1. **Linear Progress**: Each step builds on the last
2. **Test Frequently**: Verify each component works before moving on
3. **Use Standard Patterns**: Stick to common Node.js/Express patterns
4. **Clear Error Messages**: Make debugging easy
5. **Incremental Features**: Start simple, enhance iteratively

### Code Quality Standards
- Clear variable and function names
- Comprehensive error handling
- Logging for all MCP operations
- Comments explaining business logic
- Modular, testable code structure

## Risk Mitigation

### Technical Risks
- **MCP Server Issues**: Fallback to direct API calls if needed
- **LLM Rate Limits**: Implement caching and request queuing
- **Slack Downtime**: Local testing interface remains available

### Data Risks
- **Brand Confusion**: Strict validation and confirmation flows
- **Stale Data**: Regular cache refreshing
- **Security**: Environment variables for all credentials

## Next Steps

### Immediate Actions (Today)
1. ✅ Create project structure
2. ✅ Document prompts and examples
3. ✅ Create this master plan
4. Install and configure MCP servers
5. Build CLI test interface

### This Week
1. Complete Phase 1 (local agent)
2. Test with real queries
3. Refine based on results
4. Deploy Slack integration
5. Launch to team

## Maintenance & Evolution

### Regular Tasks
- Weekly prompt refinements based on usage
- Monthly review of data patterns
- Quarterly feature additions based on feedback

### Future Enhancements (Post-MVP)
- Web dashboard interface
- Proactive alerts and notifications
- Advanced analytics and reporting
- Custom reports and exports
- Integration with more tools (Amplitude, Stripe, etc.)

## Resources & Documentation

### Required Documentation
- API keys setup guide
- MCP server installation instructions
- Slack app configuration steps
- Troubleshooting guide
- Example queries for testing

### Support Resources
- MCP documentation: https://modelcontextprotocol.io
- Slack Bolt docs: https://slack.dev/bolt-js
- OpenAI API docs: https://platform.openai.com/docs
- Node.js best practices: https://nodejs.org/en/docs/guides

---

This plan is designed for 100% AI implementation using Cursor/Cline. Each phase has clear, achievable goals with minimal complexity and maximum impact.
