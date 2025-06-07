import { google, drive_v3 } from 'googleapis';
import { createDriveClient, refreshAccessToken } from './google-oauth';
import { createClient } from '@/supabase/server';

export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private userId: string;

  constructor(accessToken: string, userId: string) {
    this.drive = createDriveClient(accessToken);
    this.userId = userId;
  }

  // Get or refresh valid access token
  static async getValidAccessToken(userId: string): Promise<string> {
    const supabase = await createClient();
    
    const { data: tokenData, error } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData) {
      throw new Error('No Google Drive connection found');
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt <= now) {
      // Token expired, refresh it
      const { accessToken, expiresAt: newExpiresAt } = await refreshAccessToken(tokenData.refresh_token);
      
      // Update token in database
      await supabase
        .from('user_google_tokens')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return accessToken;
    }

    return tokenData.access_token;
  }

  // List files with search and filtering
  async listFiles(options?: {
    query?: string;
    mimeType?: string;
    folderId?: string;
    pageSize?: number;
    pageToken?: string;
  }) {
    const queryParts: string[] = [];
    
    // Build query
    if (options?.query) {
      queryParts.push(`name contains '${options.query}'`);
    }
    
    if (options?.mimeType) {
      queryParts.push(`mimeType = '${options.mimeType}'`);
    }
    
    if (options?.folderId) {
      queryParts.push(`'${options.folderId}' in parents`);
    } else {
      // Default to root folder
      queryParts.push("'root' in parents");
    }
    
    // Exclude trashed files
    queryParts.push('trashed = false');
    
    const q = queryParts.join(' and ');
    
    try {
      const response = await this.drive.files.list({
        q,
        pageSize: options?.pageSize || 20,
        pageToken: options?.pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink, parents)',
        orderBy: 'modifiedTime desc',
      });

      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list Google Drive files');
    }
  }

  // Get file metadata
  async getFile(fileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, iconLink, webViewLink, exportLinks',
      });

      return response.data;
    } catch (error) {
      console.error('Error getting file:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  // Download file content
  async downloadFile(fileId: string, mimeType: string): Promise<Buffer> {
    try {
      let response;
      
      // Handle Google Workspace files that need export
      if (this.isGoogleWorkspaceFile(mimeType)) {
        const exportMimeType = this.getExportMimeType(mimeType);
        response = await this.drive.files.export({
          fileId,
          mimeType: exportMimeType,
        }, { responseType: 'arraybuffer' });
      } else {
        // Regular files can be downloaded directly
        response = await this.drive.files.get({
          fileId,
          alt: 'media',
        }, { responseType: 'arraybuffer' });
      }

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

  // Export Google Doc as text
  async exportAsText(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.export({
        fileId,
        mimeType: 'text/plain',
      });

      return response.data as string;
    } catch (error) {
      console.error('Error exporting as text:', error);
      throw new Error('Failed to export document as text');
    }
  }

  // Create a new file
  async createFile(name: string, content: string | Buffer, mimeType: string, folderId?: string) {
    try {
      const media = {
        mimeType,
        body: typeof content === 'string' ? content : content.toString(),
      };

      const fileMetadata: drive_v3.Schema$File = {
        name,
        parents: folderId ? [folderId] : undefined,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink',
      });

      return response.data;
    } catch (error) {
      console.error('Error creating file:', error);
      throw new Error('Failed to create file in Google Drive');
    }
  }

  // Create StudyWithAI folder if it doesn't exist
  async getOrCreateStudyFolder(): Promise<string> {
    const folderName = 'StudyWithAI';
    
    try {
      // Check if folder exists
      const response = await this.drive.files.list({
        q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id!;
      }

      // Create folder if it doesn't exist
      const createResponse = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      return createResponse.data.id!;
    } catch (error) {
      console.error('Error getting/creating study folder:', error);
      throw new Error('Failed to access StudyWithAI folder');
    }
  }

  // Helper to determine if file is a Google Workspace file
  private isGoogleWorkspaceFile(mimeType: string): boolean {
    return mimeType.startsWith('application/vnd.google-apps.');
  }

  // Get appropriate export MIME type for Google Workspace files
  private getExportMimeType(googleMimeType: string): string {
    const exportMap: Record<string, string> = {
      'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.google-apps.drawing': 'application/pdf',
    };

    return exportMap[googleMimeType] || 'application/pdf';
  }

  // Batch operations for efficiency
  async batchGetFiles(fileIds: string[]) {
    try {
      const batch = this.drive.batch;
      const promises = fileIds.map(fileId => 
        this.getFile(fileId).catch(err => ({ error: err, fileId }))
      );
      
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error in batch get files:', error);
      throw new Error('Failed to batch get files');
    }
  }
}