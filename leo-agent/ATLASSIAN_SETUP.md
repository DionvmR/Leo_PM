# Atlassian (Jira/Confluence) Setup for Leo Agent

The Atlassian MCP server is showing 0 tools because it needs valid API credentials. Follow these steps to set it up:

## 1. Generate an Atlassian API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a label like "Leo Agent"
4. Copy the generated token

## 2. Update Your .env File

Replace `your-jira-api-token-here` and `your-confluence-api-token-here` in your `.env` file with the API token you just generated. 

**Note**: You can use the same API token for both JIRA and Confluence since they're both Atlassian products.

```env
JIRA_API_TOKEN=your-actual-api-token-here
CONFLUENCE_API_TOKEN=your-actual-api-token-here
```

## 3. Restart Leo Agent

After updating the .env file, restart Leo Agent:

```bash
npm start
```

## 4. Verify Connection

When Leo starts, you should see something like:
```
Atlassian (Jira/Confluence) connected with 6 tools available
Available tools for Atlassian (Jira/Confluence): ['confluence_search', 'confluence_get_page', 'confluence_get_comments', 'jira_get_issue', 'jira_search', 'jira_get_project_issues']
```

## Troubleshooting

If you still see 0 tools:
- Verify your API token is correct
- Check that your email/username matches your Atlassian account
- Ensure your account has access to the Jira/Confluence instances
- Look for error messages in the console output

## Security Note

Never commit your API tokens to version control. The `.gitignore` file should already exclude `.env` files.
