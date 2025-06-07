# Google Drive Integration Implementation

## Overview
This document outlines the complete Google Drive integration for the AI learning assistant platform, allowing users to:
- Link their Google Drive account via OAuth2
- Browse and select documents from their Drive
- Load documents into AI chat sessions
- Save generated content back to Drive

## Architecture

### Backend Components

1. **OAuth2 Flow**
   - `/api/auth/google` - Initiates OAuth flow
   - `/api/auth/google/callback` - Handles OAuth callback
   - `/api/auth/google/disconnect` - Unlinks Google account

2. **Drive Operations**
   - `/api/drive/files` - Lists Drive files with search/filter
   - `/api/drive/fetch` - Loads a file into the platform
   - `/api/drive/upload` - Saves content to Drive

3. **Services**
   - `GoogleDriveService` - Handles all Drive API operations
   - Token refresh logic with automatic retry

### Frontend Components

1. **Google Drive Picker** (`google-drive-picker.tsx`)
   - File browser with folder navigation
   - Search functionality
   - File type filtering
   - Loading states and error handling

2. **Save to Drive Button** (`save-to-drive-button.tsx`)
   - One-click save for generated content
   - Supports flashcards, quizzes, summaries, notes
   - Shows success with Drive link

3. **Google Drive Settings** (`google-drive-settings.tsx`)
   - Connect/disconnect interface
   - Connection status display
   - Feature descriptions

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
   - Copy Client ID and Client Secret

### 2. Environment Configuration

Add to your `.env.local`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Database Migration

Run the migration to create necessary tables:
```bash
supabase migration up
```

This creates:
- `user_google_tokens` - Stores OAuth tokens
- `linked_drive_files` - Tracks Drive files
- Updates `documents` table with Drive fields

### 4. Install Dependencies

```bash
npm install googleapis google-auth-library
```

## Usage Guide

### For Users

1. **Connecting Google Drive**
   - Go to Settings > Integrations
   - Click "Connect Google Drive"
   - Authorize the requested permissions
   - You'll be redirected back after success

2. **Loading Documents from Drive**
   - In chat interface, click "Google Drive" option
   - Browse or search for your file
   - Click to load it into the chat
   - Document text will be extracted automatically

3. **Saving to Drive**
   - After generating content (flashcards, etc.)
   - Click "Save to Drive" button
   - Content saves to "StudyWithAI" folder
   - Get shareable link instantly

### For Developers

#### Adding New File Type Support

To support additional file types, update:

1. `google-drive-picker.tsx` - Add to `supportedTypes` array
2. `/api/drive/fetch/route.ts` - Add extraction logic
3. `google-drive-service.ts` - Update `getExportMimeType` if needed

#### Customizing Save Format

Modify `formatContentAsMarkdown` in `/api/drive/upload/route.ts` to change how content is formatted when saved to Drive.

## Security Considerations

1. **Token Storage**
   - Tokens are stored encrypted in Supabase
   - Row Level Security (RLS) ensures users can only access their own tokens
   - Refresh tokens are used to maintain access

2. **Scope Limitations**
   - Only requested scopes: `drive.file`, `drive.readonly`, `drive.metadata.readonly`
   - Users can revoke access anytime from Google Account settings

3. **State Parameter**
   - OAuth state parameter prevents CSRF attacks
   - Contains user ID and timestamp
   - Validated on callback

## Error Handling

The integration handles various error cases:
- Expired tokens (automatic refresh)
- Network failures (with retry)
- Unsupported file types (user notification)
- Missing permissions (prompts reconnection)

## Rate Limiting

Google Drive API has quotas:
- 1,000,000,000 queries per day
- 1,000 queries per 100 seconds per user

The implementation includes:
- Request batching where possible
- Caching of file metadata
- Pagination for large file lists

## Future Enhancements

1. **Real-time Sync**
   - Watch for changes in Drive files
   - Auto-update when source documents change

2. **Team Drives**
   - Support for shared drives
   - Collaborative study sessions

3. **Advanced Export Options**
   - Export as Google Docs native format
   - Custom templates for different content types

4. **Offline Support**
   - Cache frequently accessed files
   - Queue uploads when offline

## Troubleshooting

### Common Issues

1. **"Google Drive not connected" error**
   - User needs to connect their account first
   - Check if tokens exist in database

2. **File won't load**
   - Verify file type is supported
   - Check file size limits
   - Ensure user has read permissions

3. **Save to Drive fails**
   - Verify user still has valid connection
   - Check if StudyWithAI folder exists
   - Ensure content isn't too large

### Debug Mode

Enable debug logging:
```typescript
// In google-drive-service.ts
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) console.log('Drive API call:', ...);
```

## Support

For issues or questions:
1. Check error logs in Supabase dashboard
2. Verify Google Cloud Console quotas
3. Test with different file types/sizes
4. Review browser console for client errors