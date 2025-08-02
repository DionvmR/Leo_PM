# Leo: AI PM Agent for TrueFire Studios

## Project Overview
Leo is an AI-powered Product Manager agent designed to help the TrueFire Studios team manage projects, track progress, and provide critical feedback on product ideas. **TrueFire Studios consists of five distinct brands: TrueFire, ArtistWorks, Blayze, FaderPro, and JamPlay.** Leo works across all five brands, supporting each with their unique needs and data.

When anyone asks Leo a question, Leo will confirm which brand the question is about (and ask a follow-up if it's not clear). When searching for information or context in our tools and data sources, Leo will only use brand-specific data to ensure accurate and relevant responses for each brand.

Leo will connect to all our core tools, aggregate data, and be accessible directly in Slack, making it easy for anyone on the team to get help, updates, and insights.

---

## Vision
- **Empower the team** to make better product decisions using all available data.
- **Centralize information** from JIRA, Confluence, Google Drive, Github, Intercom, Stripe, Google Calendar, Granola (meeting transcripts), and Amplitude (product analytics).
- **Make Leo accessible** to everyone in Slack, with a web dashboard to be added later.

---

## Phased Approach

### Phase 1: MVP (Minimum Viable Product)
**Goal:** Get Leo working in Slack with core integrations and basic features.

**Features:**
- Leo is a Slack bot anyone can message in the workspace.
- Connect to JIRA, Confluence, Google Drive, and Github.
- Answer questions about project status, tasks, and documents.
- Simple authentication: team members connect their accounts with a few clicks.
- Basic progress tracking and reporting.

**Steps:**
1. Define the most important questions/tasks Leo should help with first.
2. Set up Slack bot and add Leo to the workspace.
3. Build connections to JIRA, Confluence, Google Drive, and Github.
4. Set up secure authentication for each tool (easy connect process).
5. Test Leo with real team questions in Slack.
6. Gather feedback and improve responses.

---

### Phase 2: Advanced Integrations & Features
**Goal:** Expand Leo's capabilities by connecting to additional data sources and leveraging new types of information.

**Features:**
- Integrate Intercom (customer feedback), Stripe (revenue), Amplitude (product analytics), and Granola (meeting transcripts).
- Use customer feedback and analytics to give better product advice and insights.
- Summarize meeting transcripts and highlight action items.
- Support more advanced questions and feedback that leverage these new data sources.
- Personalize responses based on who is asking and the brand context.

**Steps:**
1. Add each new integration (Intercom, Stripe, Amplitude, Granola) one at a time, starting with the most valuable.
2. Enhance Leo's ability to combine and analyze information from these new sources.
3. Make it easy for team members to connect new tools.
4. Test new features with the team and gather feedback.

---

### Phase 3: Web Dashboard & Proactive AI
**Goal:** Give the team a visual dashboard and make Leo more proactive.

**Features:**
- Web dashboard for viewing project status, reports, and insights.
- Admin area for managing integrations and settings.
- Leo proactively flags risks, blockers, or opportunities.
- Advanced analytics and custom reports.

**Steps:**
1. Design and build a simple web dashboard.
2. Add admin features for managing Leo and integrations.
3. Enable Leo to send proactive updates in Slack or the dashboard.
4. Continue improving based on team needs.

---

## Key Principles
- **Easy to use:** Leo should be simple for everyone, with no technical setup required.
- **Secure:** All data connections use secure authentication. Team members only see what they have access to.
- **Flexible:** Start with Slack, add a web UI later as needed.
- **Team-driven:** Build features based on real team feedback and needs.

---

## Next Steps
1. Finalize the list of core questions and tasks for Leo to handle first.
2. Choose a developer or team to build the MVP.
3. Set up Slack and the first integrations (JIRA, Confluence, Google Drive, Github).
4. Test with the team and gather feedback.
5. Plan for advanced integrations and the web dashboard.

---

*This plan is a living document. Update it as the project evolves and new needs arise.* 