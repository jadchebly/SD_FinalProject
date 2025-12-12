import { randomUUID } from 'crypto';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Mock upload image to S3
 * Returns a deterministic fake URL without actually uploading to AWS
 */
export async function uploadImageToS3(
  file: Express.Multer.File,
  folder: string = 'images'
): Promise<UploadResult> {
  // Validate file type (same validation as real implementation)
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

  // Return mock S3 URL (no actual upload)
  // Use mock-storage to match test expectations
  const url = `https://mock-storage/${fileName}`;

  return {
    url,
    path: fileName,
  };
}

/**
 * Mock delete image from S3
 * No-op that resolves immediately without actually deleting from AWS
 */
export async function deleteImageFromS3(imageUrl: string): Promise<void> {
  if (!imageUrl || imageUrl.startsWith('data:')) {
    // Skip deletion for data URLs (local images)
    return;
  }

  // No-op: just resolve successfully
  return Promise.resolve();
}

