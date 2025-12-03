import { supabase, supabaseAdmin } from '../config/database';
import { randomUUID } from 'crypto';

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadImageToSupabase(
  file: Express.Multer.File,
  bucket: string = 'posts',
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

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return {
    url: urlData.publicUrl,
    path: fileName,
  };
}

export async function deleteImageFromSupabase(
  imageUrl: string,
  bucket: string = 'posts'
): Promise<void> {
  if (!imageUrl || imageUrl.startsWith('data:')) {
    // Skip deletion for data URLs (local images)
    console.log('Skipping deletion for data URL');
    return;
  }

  try {
    // Extract path from Supabase Storage URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/posts/images/xxx.jpg
    const urlParts = imageUrl.split('/storage/v1/object/public/');
    if (urlParts.length < 2) {
      console.warn('Invalid Supabase Storage URL:', imageUrl);
      return;
    }

    // Get everything after /storage/v1/object/public/
    const pathWithBucket = urlParts[1];
    
    // Remove bucket name from path (e.g., "posts/images/xxx.jpg" -> "images/xxx.jpg")
    const path = pathWithBucket.startsWith(`${bucket}/`) 
      ? pathWithBucket.substring(bucket.length + 1)
      : pathWithBucket;
    
    console.log('Attempting to delete image from path:', path);
    console.log('Full URL was:', imageUrl);
    console.log('Using bucket:', bucket);
    
    // Use admin client for deletions to bypass RLS policies
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Error deleting image from Supabase Storage:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Don't throw - image deletion failure shouldn't block post deletion
      throw error; // Actually throw so we can see the error
    } else {
      console.log('Image deleted successfully from storage:', path);
      console.log('Delete result:', data);
    }
  } catch (error) {
    console.error('Exception while deleting image:', error);
    // Re-throw to see the actual error
    throw error;
  }
}

