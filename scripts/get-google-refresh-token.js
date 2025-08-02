const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const destroyer = require('server-destroy');
const fs = require('fs');
const { exec } = require('child_process');

// Load the OAuth2 credentials from the JSON file
const credentialsPath = process.argv[2];
if (!credentialsPath) {
  console.error('Please provide the path to your OAuth credentials JSON file');
  console.error('Usage: node get-google-refresh-token.js /path/to/credentials.json');
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
} catch (error) {
  console.error('Error reading credentials file:', error.message);
  process.exit(1);
}

// Handle both desktop (installed) and web application credentials
const clientConfig = credentials.installed || credentials.web;
if (!clientConfig) {
  console.error('Invalid credentials file format');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientConfig.client_id,
  clientConfig.client_secret,
  'http://localhost:3000/oauth2callback'
);

// Generate the auth URL with the required scopes
const scopes = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];

async function authenticate() {
  return new Promise((resolve, reject) => {
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
      prompt: 'consent' // Force to get refresh token
    });

    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, `http://localhost:3000`).searchParams;
          const code = qs.get('code');
          
          res.end('Authentication successful! You can close this window and return to the terminal.');
          server.destroy();

          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          
          console.log('\n=== Authentication Successful! ===\n');
          console.log('Your credentials for the MCP server:\n');
          console.log(`GOOGLE_CLIENT_ID=${clientConfig.client_id}`);
          console.log(`GOOGLE_CLIENT_SECRET=${clientConfig.client_secret}`);
          console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
          console.log('Copy these values - you\'ll need them to configure the MCP server.\n');
          
          resolve(tokens);
        }
      } catch (e) {
        reject(e);
      }
    }).listen(3000, () => {
      console.log('Opening browser for authentication...');
      console.log('If the browser doesn\'t open automatically, please visit:');
      console.log(authorizeUrl);
      
      // Try to open the browser using the system's open command
      const openCommand = process.platform === 'win32' ? 'start' : 
                         process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${openCommand} "${authorizeUrl}"`);
    });
    
    destroyer(server);
  });
}

authenticate().catch(console.error);
