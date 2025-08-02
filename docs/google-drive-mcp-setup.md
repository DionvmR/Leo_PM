# Google Drive MCP Setup Documentation

This document describes how the Google Drive MCP server was configured for this project.

## Installation Date
- **Date**: August 2, 2025
- **MCP Package**: `@chinchillaenterprises/mcp-google-drive` v1.0.2

## Setup Steps Completed

### 1. Package Installation
```bash
npm install -g @chinchillaenterprises/mcp-google-drive
```

### 2. Google Cloud Configuration
1. Created a new Google Cloud Project
2. Enabled Google Drive API
3. Created OAuth 2.0 credentials:
   - Type: **Web application**
   - Name: MCP Google Drive Web
   - Authorized redirect URI: `http://localhost:3000/oauth2callback`

### 3. OAuth Credentials
The following credentials were obtained and configured:
- **Client ID**: `876730889226-8rp5oeus4utbdh5cdou2etiimrccnc1u.apps.googleusercontent.com`
- **Client Secret**: (stored securely in MCP settings)
- **Refresh Token**: (stored securely in MCP settings)

### 4. MCP Configuration Location
The MCP server configuration is stored in:
```
/Users/dionvm/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

### 5. Available Tools
The Google Drive MCP server provides these tools:
- `drive_list_drives` - List all accessible shared drives
- `drive_get_drive_info` - Get drive metadata and quota
- `drive_list_files` - List files with pagination
- `drive_search_files` - Search files by name, type, or content
- `drive_get_file_content` - Read text file contents
- `drive_list_folder_contents` - List folder contents
- `drive_get_folder_tree` - Get folder structure
- `drive_list_permissions` - View file access permissions
- `drive_get_sharing_info` - Get sharing settings

## How to Recreate Setup

If you need to recreate this setup:

1. Install the MCP package globally
2. Create a new OAuth client in Google Cloud Console (Web application type)
3. Add the redirect URI: `http://localhost:3000/oauth2callback`
4. Use the authentication script (see `scripts/get-google-refresh-token.js`)
5. Add the configuration to your MCP settings file

## Security Notes

- Never commit the MCP settings file to version control
- The refresh token provides long-term access to your Google Drive
- Keep your OAuth credentials secure
- Regularly review and rotate credentials if needed
