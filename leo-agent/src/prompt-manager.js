/**
 * Prompt Manager
 * Loads and manages system prompts for Leo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PromptManager {
  constructor() {
    this.promptsDir = path.join(__dirname, '..', 'prompts');
    this.systemPrompt = this.loadSystemPrompt();
    this.brandPrompts = this.loadBrandPrompts();
  }
  
  /**
   * Load the main system prompt
   */
  loadSystemPrompt() {
    try {
      const promptPath = path.join(this.promptsDir, 'system.md');
      if (fs.existsSync(promptPath)) {
        return fs.readFileSync(promptPath, 'utf8');
      }
    } catch (error) {
      console.warn('Could not load system prompt, using default');
    }
    
    // Default system prompt
    return `You are Leo, an AI Product Manager assistant for TrueFire Studios.

TrueFire Studios operates 5 distinct brands:
- TrueFire: Online guitar lessons and courses
- ArtistWorks: Video exchange learning platform for various instruments
- Blayze: Sports and racing coaching platform
- FaderPro: DJ and electronic music production education
- JamPlay: Guitar lessons platform

Your role is to:
1. Help the team make data-driven product decisions
2. Analyze customer feedback and feature requests
3. Track project progress and identify blockers
4. Provide strategic product insights
5. Connect information across different tools (JIRA, Confluence, Intercom, etc.)

Always:
- Confirm which brand a question relates to
- Use brand-specific data and context
- Cite specific metrics and sources when available
- Balance customer needs with technical feasibility
- Consider both quick wins and long-term strategy

You are knowledgeable, analytical, and focused on helping the team succeed.`;
  }
  
  /**
   * Load brand-specific prompts
   */
  loadBrandPrompts() {
    const prompts = {};
    const brandsDir = path.join(this.promptsDir, 'brands');
    
    try {
      if (fs.existsSync(brandsDir)) {
        const files = fs.readdirSync(brandsDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const brandName = file.replace('.md', '');
            const content = fs.readFileSync(path.join(brandsDir, file), 'utf8');
            prompts[brandName] = content;
          }
        }
      }
    } catch (error) {
      console.warn('Could not load brand prompts');
    }
    
    return prompts;
  }
  
  /**
   * Get the complete system prompt, optionally with brand-specific additions
   * @param {string|null} brand - Brand name
   * @returns {string} - Complete system prompt
   */
  getSystemPrompt(brand = null) {
    let prompt = this.systemPrompt;
    
    if (brand && this.brandPrompts[brand.toLowerCase()]) {
      prompt += '\n\n' + this.brandPrompts[brand.toLowerCase()];
    }
    
    return prompt;
  }
  
  /**
   * Create example conversation based on LEO_PROMPT_AND_EXAMPLES.md
   * @returns {Array} - Example messages
   */
  getExampleConversation() {
    return [
      {
        role: 'user',
        content: 'What are the top customer complaints for TrueFire this month?'
      },
      {
        role: 'assistant',
        content: `I'll analyze the customer complaints for TrueFire this month. Let me check the data from Intercom and our feedback channels.

Based on the data:

**Top 5 Customer Complaints for TrueFire (Current Month):**

1. **Video Playback Issues** (127 tickets, 23% of complaints)
   - Buffering problems on mobile devices
   - Video quality automatically dropping to low resolution
   - Several reports from users in Europe and Asia

2. **Course Navigation Confusion** (89 tickets, 16% of complaints)
   - Difficulty finding previously watched lessons
   - Progress tracking not updating correctly
   - Requests for better course organization

3. **Billing/Subscription Issues** (76 tickets, 14% of complaints)
   - Confusion about renewal dates
   - Difficulty canceling subscriptions
   - Some double-charging incidents (already resolved)

4. **Mobile App Performance** (64 tickets, 12% of complaints)
   - App crashes on older Android devices
   - Offline download feature not working reliably
   - Login issues after app updates

5. **Content Requests** (58 tickets, 11% of complaints)
   - More advanced jazz guitar content
   - Requests for specific instructors
   - More left-handed guitarist options

**Recommendations:**
1. **Immediate Action**: Address video playback issues - this affects user experience directly
2. **Quick Win**: Improve course navigation UI - relatively simple fix with high impact
3. **Strategic**: Invest in mobile app stability for better retention

Would you like me to dive deeper into any of these issues or check for related JIRA tickets?`
      }
    ];
  }
  
  /**
   * Reload prompts from disk
   */
  reload() {
    this.systemPrompt = this.loadSystemPrompt();
    this.brandPrompts = this.loadBrandPrompts();
  }
  
  /**
   * Save a custom prompt
   * @param {string} type - 'system' or brand name
   * @param {string} content - Prompt content
   */
  savePrompt(type, content) {
    try {
      // Ensure prompts directory exists
      if (!fs.existsSync(this.promptsDir)) {
        fs.mkdirSync(this.promptsDir, { recursive: true });
      }
      
      if (type === 'system') {
        fs.writeFileSync(path.join(this.promptsDir, 'system.md'), content, 'utf8');
      } else {
        // Brand-specific prompt
        const brandsDir = path.join(this.promptsDir, 'brands');
        if (!fs.existsSync(brandsDir)) {
          fs.mkdirSync(brandsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(brandsDir, `${type.toLowerCase()}.md`), content, 'utf8');
      }
      
      // Reload after saving
      this.reload();
    } catch (error) {
      console.error('Failed to save prompt:', error);
      throw error;
    }
  }
}
