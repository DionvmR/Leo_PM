# Google OAuth Setup Guide

## Current Status
- ✅ You have the correct redirect URI in Google Cloud Console: `http://localhost:3000/oauth2callback`
- ✅ Your Client ID is correctly set in .env
- ❌ Your Client Secret is not set in .env
- ❌ Your Refresh Token is not set in .env

## Complete Setup Steps

### 1. Update your .env file with the Client Secret

Your client secret from the credentials file is: `YOUR_CLIENT_SECRET_HERE`

Update your `.env` file:
```
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

### 2. Run the OAuth Script

```bash
cd scripts
node get-google-refresh-token.js ../Downloads/YOUR_CLIENT_SECRET_FILE.json
```

### 3. If you still get the redirect_uri_mismatch error:

1. **Clear your browser cache** or try in an incognito window
2. **Wait a few minutes** - Google OAuth changes can take 5-10 minutes to propagate
3. **Verify the exact URI** - Make sure there are no trailing slashes or spaces
4. **Check the OAuth consent screen** - Ensure it's configured properly:
   - Go to APIs & Services → OAuth consent screen
   - Make sure it's in "Testing" or "Production" status
   - Add your email to test users if in Testing mode

### 4. Alternative: Use a different port

If localhost:3000 is causing issues, you can:

1. Edit `scripts/get-google-refresh-token.js` to use a different port (e.g., 8080)
2. Add the new redirect URI to Google Cloud Console
3. Try again

### 5. Once successful:

The script will output:
- GOOGLE_CLIENT_ID (already have this)
- GOOGLE_CLIENT_SECRET (need to add to .env)
- GOOGLE_REFRESH_TOKEN (need to add to .env)

Add all three to your `leo-agent/.env` file.

## Troubleshooting

If the error persists:
1. Double-check that the Client ID in your .env matches exactly
2. Ensure no spaces or hidden characters in the redirect URI
3. Try deleting and recreating the OAuth client in Google Cloud Console
4. Check if you have multiple Google accounts - ensure you're using the right one
