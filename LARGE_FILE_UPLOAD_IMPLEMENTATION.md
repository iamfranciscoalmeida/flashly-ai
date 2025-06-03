# Large File Upload Implementation Guide

## Current Solution
The immediate fix for the "payload too large" error involves:

1. **Increased Storage Bucket Limit**: Updated from 50MB to 100MB
2. **File Size Validation**: Added client-side validation with user-friendly error messages
3. **Progress Indicators**: Better upload progress tracking for large files
4. **Error Handling**: Specific error messages for different file size scenarios

## Future Enhancement: TUS Resumable Uploads

For files larger than 100MB, implement TUS (The Upload Server) protocol for resumable uploads.

### Why TUS?
- Supports files up to 50GB on Supabase Pro+ plans
- Automatic retry on network interruptions
- Chunked uploads for better reliability
- Resume uploads from where they left off

### Implementation Steps

#### 1. Install TUS Client
```bash
npm install tus-js-client
```

#### 2. Update File Upload Component
```typescript
import * as tus from 'tus-js-client';

const uploadWithTUS = async (file: File, filePath: string, user: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session?.access_token}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'study-documents',
        objectName: filePath,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // 6MB chunks
      onError(error) {
        console.error('TUS upload error:', error);
        reject(error);
      },
      onProgress(bytesUploaded, bytesTotal) {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        setProgress(percentage);
      },
      onSuccess() {
        console.log('TUS upload completed successfully');
        resolve();
      },
    });

    // Check for previous uploads and resume if found
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
};
```

#### 3. Integration with Current Component
```typescript
// In the uploadLargeFile function, replace the current implementation:
if (file.size > VERY_LARGE_FILE_THRESHOLD) { // e.g., 100MB
  await uploadWithTUS(file, filePath, user);
} else {
  // Use standard upload for smaller files
  await standardUpload(file, filePath);
}
```

### Configuration Options

#### Bucket Settings for Large Files
```sql
-- For files up to 5GB (Pro plan)
UPDATE storage.buckets 
SET file_size_limit = 5368709120  -- 5GB in bytes
WHERE id = 'study-documents';

-- For files up to 50GB (Enterprise)
UPDATE storage.buckets 
SET file_size_limit = 53687091200  -- 50GB in bytes
WHERE id = 'study-documents';
```

#### Environment Variables
```env
# Maximum file size for TUS uploads
NEXT_PUBLIC_MAX_TUS_FILE_SIZE=5368709120  # 5GB
NEXT_PUBLIC_TUS_CHUNK_SIZE=6291456        # 6MB
```

### User Experience Improvements

#### File Size Indicators
```typescript
const getFileSizeCategory = (size: number) => {
  if (size > 5 * 1024 * 1024 * 1024) return 'very-large'; // > 5GB
  if (size > 100 * 1024 * 1024) return 'large';          // > 100MB
  if (size > 6 * 1024 * 1024) return 'medium';           // > 6MB
  return 'small';
};

const getUploadMethod = (category: string) => {
  switch (category) {
    case 'very-large':
      return 'Resumable upload (chunked)';
    case 'large':
      return 'Optimized upload';
    case 'medium':
      return 'Standard upload';
    default:
      return 'Quick upload';
  }
};
```

#### Progress Visualization
```typescript
const ProgressIndicator = ({ progress, fileSize, uploadMethod }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>Uploading... ({uploadMethod})</span>
      <span>{progress}%</span>
    </div>
    <Progress value={progress} />
    <div className="text-xs text-gray-500">
      {(fileSize / 1024 / 1024).toFixed(2)} MB • 
      Estimated time: {estimateUploadTime(fileSize, progress)}
    </div>
  </div>
);
```

### Error Recovery
```typescript
const handleUploadError = (error: any, fileSize: number) => {
  if (error.message?.includes('network')) {
    return "Network interruption detected. Upload will resume automatically.";
  }
  
  if (error.message?.includes('size')) {
    return `File too large (${(fileSize / 1024 / 1024).toFixed(2)} MB). Maximum allowed: ${MAX_FILE_SIZE_MB} MB`;
  }
  
  return "Upload failed. Please try again.";
};
```

### Testing Large Uploads
1. Test with files of various sizes (10MB, 50MB, 100MB, 500MB)
2. Simulate network interruptions
3. Test resume functionality
4. Monitor server resources during upload
5. Validate error handling for edge cases

### Monitoring and Analytics
```typescript
// Track upload performance
const trackUploadMetrics = {
  fileSize: file.size,
  uploadMethod: method,
  duration: uploadTime,
  chunksUploaded: chunks,
  retryCount: retries,
  success: completed
};

// Send to analytics service
analytics.track('file_upload_completed', trackUploadMetrics);
```

This implementation provides a robust solution for handling files of any size while maintaining a great user experience. 