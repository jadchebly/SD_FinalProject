import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export interface UploadResult {
  url: string;
  path: string;
}

// Helper function to determine if we're in staging
function isStaging(): boolean {
  return process.env.NODE_ENV === 'staging' || !!process.env.STAGING_AWS_REGION;
}

// Helper function to get environment variable (STAGING_* prefix in staging, regular otherwise)
function getEnvVar(regularName: string, stagingName: string): string | undefined {
  if (isStaging()) {
    return process.env[stagingName] || process.env[regularName];
  }
  return process.env[regularName];
}

// Get S3 configuration (use STAGING_* variables if in staging)
const awsRegion = getEnvVar('AWS_REGION', 'STAGING_AWS_REGION') || 'eu-north-1';
const awsAccessKeyId = getEnvVar('AWS_ACCESS_KEY_ID', 'STAGING_AWS_ACCESS_KEY_ID') || '';
const awsSecretAccessKey = getEnvVar('AWS_SECRET_ACCESS_KEY', 'STAGING_AWS_SECRET_ACCESS_KEY') || '';
const bucketName = getEnvVar('AWS_S3_BUCKET_NAME', 'STAGING_AWS_S3_BUCKET_NAME') || 'amzn-s3-ie-assignment';

// Initialize S3 client
const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

const BUCKET_NAME = bucketName;

/**
 * Upload image to S3
 */
export async function uploadImageToS3(
  file: Express.Multer.File,
  folder: string = 'images'
): Promise<UploadResult> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit');
  }

  // Generate unique filename
  const fileExtension = file.originalname.split('.').pop() || 'jpg';
  const fileName = `${folder}/${randomUUID()}.${fileExtension}`;

  // Upload to S3
  // Note: ACL is not used - bucket policy handles public access
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL removed - bucket policy handles public access when ACLs are disabled
  });

  try {
    await s3Client.send(command);
    console.log('Image uploaded to S3:', fileName);
  } catch (error: any) {
    console.error('S3 upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Return S3 URL
  const url = `https://${BUCKET_NAME}.s3.${awsRegion}.amazonaws.com/${fileName}`;

  return {
    url,
    path: fileName,
  };
}

/**
 * Delete image from S3
 */
export async function deleteImageFromS3(imageUrl: string): Promise<void> {
  if (!imageUrl || imageUrl.startsWith('data:')) {
    // Skip deletion for data URLs (local images)
    console.log('Skipping deletion for data URL');
    return;
  }

  try {
    // Extract path from S3 URL
    let path: string;
    
    if (imageUrl.includes('.s3.')) {
      // Extract from S3 URL: https://bucket.s3.region.amazonaws.com/images/uuid.jpg
      const urlParts = imageUrl.split('.amazonaws.com/');
      if (urlParts.length < 2) {
        console.warn('Invalid S3 URL:', imageUrl);
        return;
      }
      path = urlParts[1];
    } else {
      // Try to extract path from URL
      const urlObj = new URL(imageUrl);
      path = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
    }

    console.log('Attempting to delete image from S3 path:', path);
    console.log('Full URL was:', imageUrl);

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    await s3Client.send(command);
    console.log('Image deleted successfully from S3:', path);
  } catch (error: any) {
    console.error('Error deleting image from S3:', error);
    throw error;
  }
}

