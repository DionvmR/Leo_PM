# Permission-Based MCP Access for Leo

## Overview

After investigating timeout issues, we discovered a fundamental difference between Leo's current MCP implementation and typical LLM+MCP patterns. This document explains the new permission-based approach.

## The Problem

### Current Behavior (Automatic MCP Access)
- Leo automatically queries MCP servers when detecting keywords like "drive", "jira", "confluence"
- No user confirmation before making external API calls
- Leads to:
  - Unnecessary API calls
  - Broad, unfocused queries
  - Timeout issues due to overly complex or unnecessary requests
  - Resource waste

### Typical LLM+MCP Behavior
- LLM asks permission: "I can search your Google Drive for that. Would you like me to?"
- User confirms or denies
- Only then does the LLM make the API call

## The Solution: Permission-Based Access

### How It Works

1. **Intent Detection**: Leo analyzes the message for MCP-related keywords
2. **Permission Request**: Instead of immediately querying, Leo asks for permission
3. **User Control**: User can confirm or deny the request
4. **Targeted Execution**: Only confirmed requests trigger MCP queries

### Implementation Details

The new `agent-permission-based.js` includes:

```javascript
// Detect MCP intent based on keywords
detectMCPIntent(message) {
  // Checks for jira, confluence, drive keywords
  // Returns intent object or null
}

// Generate appropriate permission request
generatePermissionRequest(intent, originalMessage) {
  // Returns user-friendly permission request
  // "I'll need to search your Jira issues. Would you like me to?"
}

// Handle confirmations/denials
isConfirmation(message) // Checks for yes, sure, ok, etc.
isDenial(message)       // Checks for no, cancel, never mind, etc.
```

### Conversation Flow Example

**Before (Automatic)**:
```
User: "What documents do we have about TrueFire 1.25?"
Leo: [Immediately queries Google Drive, might timeout]
Leo: "I found these documents..." [or timeout error]
```

**After (Permission-Based)**:
```
User: "What documents do we have about TrueFire 1.25?"
Leo: "I can help you with that. To provide the most accurate information, I'll need to search your Google Drive. Would you like me to look for relevant documents and files?"
User: "Yes please"
Leo: [Now queries Google Drive with user consent]
Leo: "I found these documents..."
```

## Benefits

1. **Reduced Timeouts**: Only makes API calls when explicitly requested
2. **Better User Experience**: Users understand what Leo is doing
3. **More Targeted Queries**: Users can refine their request before API call
4. **Resource Efficiency**: No wasted API calls on ambiguous requests
5. **Privacy/Security**: Users control when external systems are accessed

## Testing

Run the test script to see the permission-based approach in action:

```bash
cd leo-agent
node src/test-permission-based.js
```

This will demonstrate:
- Permission requests for different MCP types (Drive, Jira, Confluence)
- Handling of confirmations
- Handling of denials
- Normal conversations without MCP triggers

## Migration Guide

To switch Leo to permission-based MCP access:

1. **Backup current agent**:
   ```bash
   cp src/agent.js src/agent-automatic.js
   ```

2. **Replace with permission-based version**:
   ```bash
   cp src/agent-permission-based.js src/agent.js
   ```

3. **Test the change**:
   ```bash
   node src/test-permission-based.js
   ```

## Configuration Options

Future enhancements could include:

1. **Auto-confirm mode**: For trusted users/contexts
2. **Timeout settings**: Adjust how long to wait for confirmation
3. **Customizable permission messages**: Brand-specific wording
4. **Batch permissions**: "Allow all Drive searches for this session"

## Conclusion

The permission-based approach aligns Leo with standard LLM+MCP patterns and should significantly reduce timeout issues by:
- Eliminating unnecessary API calls
- Allowing users to refine queries before execution
- Making the system more transparent and user-friendly

This change represents a fundamental improvement in how Leo interacts with external systems.
