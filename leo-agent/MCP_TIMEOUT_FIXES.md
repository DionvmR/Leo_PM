# MCP Manager Timeout Fixes

## Summary of Improvements

This document outlines the fixes implemented to address timeout issues with Google Drive and Atlassian MCP connections.

## Latest Update (8/3/2025) - Further Investigation

### Root Cause Identified

After extensive debugging, we've identified that:

1. **MCP connections work fine** - Connecting to servers and listing tools is very fast (1-2ms)
2. **All API calls timeout** - Both Atlassian (Jira/Confluence) and Google Drive API calls timeout after 10-15 seconds
3. **Issue is at the MCP server level** - The MCP servers themselves are timing out when making API calls to external services

### Debug Results

Running `test-mcp-debug.js` showed:
- Atlassian: Connection successful, but `jira_search` times out after 10s
- Google Drive: Connection successful, but `drive_search_files` times out after 15s

This indicates the issue is likely:
1. **Network/firewall blocking** - The MCP servers may not be able to reach external APIs
2. **Authentication issues** - The API tokens may not be working correctly
3. **Rate limiting** - The APIs may be blocking requests

### Implemented Fixes

1. **Added connection pooling** - Reuse MCP connections to reduce overhead
2. **Implemented retry logic** - Retry failed requests with exponential backoff
3. **Reduced query complexity** - Start with minimal queries (3 items)
4. **Better timeout handling** - Custom timeout wrappers at multiple levels
5. **Enhanced error messages** - More helpful user feedback

### Previous Update (8/3/2025)

#### Major Simplification - Removed Brand-Based API Filtering

After continued timeout issues, we identified that the brand-based filtering was adding unnecessary complexity. The key insight: **Let the LLM handle relevance filtering instead of pre-filtering at the API level**.

#### What Changed:
1. **Removed all brand-based project/space filtering** from Atlassian queries
2. **Removed brand prepending** from Google Drive searches  
3. **Simplified queries** to just get recent items or search by keywords
4. **Let the LLM handle relevance** - The system prompt already includes brand context

#### Benefits:
- **Much simpler queries** = faster API responses
- **No complex JQL/CQL construction** = fewer timeouts
- **Higher result limits** possible with simpler queries
- **LLM is smart enough** to filter results based on brand context

## Key Changes Made

### 1. Connection Improvements
- **Increased request timeout**: From 15s to 30s for all MCP operations
- **Added connection timeout handling**: 15s timeout with Promise.race for initial connection
- **Tool list verification**: 10s timeout to ensure server is responsive
- **Better error diagnostics**: Specific messages for timeout vs authentication failures

### 2. Progressive Query Strategy


#### Jira Queries
- Start with simple `ORDER BY updated DESC` queries
- Only add project filters if brand is specified (and only use first project initially)
- Fallback to minimal queries if simple ones fail
- Reduced result limits from 10 to 5 (or 3 for fallback)

#### Confluence Queries  
- Start with basic `type=page ORDER BY lastmodified DESC`
- Remove complex space filters and time restrictions initially
- Use text search (`text ~ "search term"`) instead of complex CQL when needed
- Reduced result limits from 10 to 3
- Progressive fallback strategy with helpful error messages

### 3. Health Monitoring
- New `healthCheck()` method for monitoring server responsiveness
- 5-second timeout for health checks
- Returns status and response time for each server
- Helps identify connectivity issues before running queries

### 4. Improved Error Handling
- Graceful timeout handling with partial results
- User-friendly error messages with suggestions
- Better cleanup of timed-out operations
- Prevents race conditions between different timeout mechanisms

## Usage Examples

### Running Health Check
```javascript
const mcpManager = new MCPManager();
await mcpManager.initialize();

// Check server health
const health = await mcpManager.healthCheck();
console.log(health);
// Output: { atlassian: { status: 'healthy', responseTime: 234 }, ... }
```

### Progressive Query Example
```javascript
// This will now start with a simple query and progressively add complexity
const results = await mcpManager.queryAtlassian('Find TF 1.25 documentation', 'TrueFire');

// If the complex query times out, you'll get a helpful message:
// { error: 'Confluence search failed', 
//   suggestion: 'Try searching with more specific terms like "TF 1.25" or a document title' }
```

## Testing

Run the health check test to verify improvements:
```bash
cd leo-agent
node src/test-mcp-health.js
```

This will:
1. Initialize MCP servers
2. Run health checks
3. Test individual queries with timing
4. Test complex queries to check timeout handling
5. Report on any timeout issues

## Benefits

1. **Faster Response Times**: Simple queries return results quickly
2. **Better Reliability**: Fallback strategies ensure some results even if complex queries fail
3. **Improved Diagnostics**: Health checks and better error messages help troubleshoot issues
4. **User-Friendly**: Helpful suggestions guide users to more effective queries

## Future Improvements

Consider implementing:
1. **Result caching**: Cache recent query results to avoid repeated slow queries
2. **Retry with exponential backoff**: Automatically retry failed queries with increasing delays
3. **Query optimization**: Analyze query patterns to pre-optimize common searches
4. **Connection pooling**: Maintain persistent connections to reduce initialization overhead
