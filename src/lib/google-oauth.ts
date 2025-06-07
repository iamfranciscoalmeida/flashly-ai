import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// OAuth2 configuration
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback',
  scopes: [
    'https://www.googleapis.com/auth/drive.file', // Access to files created or opened by the app
    'https://www.googleapis.com/auth/drive.readonly', // Read-only access to all files
    'https://www.googleapis.com/auth/drive.metadata.readonly', // Read-only access to file metadata
  ],
};

// Create OAuth2 client
export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    GOOGLE_OAUTH_CONFIG.clientId,
    GOOGLE_OAUTH_CONFIG.clientSecret,
    GOOGLE_OAUTH_CONFIG.redirectUri
  );
}

// Generate authorization URL
export function generateAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: GOOGLE_OAUTH_CONFIG.scopes,
    state: state,
    prompt: 'consent', // Force consent screen to ensure refresh token
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date!),
      scope: tokens.scope!,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw new Error('Failed to exchange authorization code');
  }
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return {
      accessToken: credentials.access_token!,
      expiresAt: new Date(credentials.expiry_date!),
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

// Create authenticated Drive client
export function createDriveClient(accessToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Verify token is still valid
export async function verifyToken(accessToken: string): Promise<boolean> {
  try {
    const oauth2Client = createOAuth2Client();
    const tokenInfo = await oauth2Client.getTokenInfo(accessToken);
    return tokenInfo.expiry_date ? tokenInfo.expiry_date > Date.now() : false;
  } catch (error) {
    return false;
  }
}