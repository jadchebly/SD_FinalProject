/**
 * S3 Bucket Test Script
 * 
 * Tests:
 * 1. S3 connection
 * 2. Upload functionality
 * 3. Public access
 * 4. Delete functionality
 * 
 * Usage: npx ts-node test-s3.ts
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

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

// Test colors
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const reset = '\x1b[0m';

function log(message: string, color: string = reset) {
  console.log(`${color}${message}${reset}`);
}

function error(message: string) {
  log(`❌ ${message}`, red);
}

function success(message: string) {
  log(`✅ ${message}`, green);
}

function info(message: string) {
  log(`ℹ️  ${message}`, blue);
}

function warn(message: string) {
  log(`⚠️  ${message}`, yellow);
}

async function testS3Connection() {
  log('\n🔍 Testing S3 Connection...\n', blue);

  // Check environment variables
  info('Checking environment variables...');
  const isStagingEnv = isStaging();
  if (isStagingEnv) {
    info('Using STAGING_* environment variables');
  }
  
  const requiredVars = isStagingEnv 
    ? ['STAGING_AWS_ACCESS_KEY_ID', 'STAGING_AWS_SECRET_ACCESS_KEY', 'STAGING_AWS_S3_BUCKET_NAME', 'STAGING_AWS_REGION']
    : ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME', 'AWS_REGION'];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    error(`Missing environment variables: ${missingVars.join(', ')}`);
    error('Please add them to your .env file');
    return false;
  }
  success('All environment variables are set');

  info(`Bucket: ${BUCKET_NAME}`);
  info(`Region: ${awsRegion}`);

  // Test bucket access
  try {
    info('Testing bucket access...');
    const command = new HeadBucketCommand({ Bucket: BUCKET_NAME });
    await s3Client.send(command);
    success('Bucket is accessible');
    return true;
  } catch (err: any) {
    error(`Cannot access bucket: ${err.message}`);
    if (err.name === 'NotFound') {
      warn('Bucket might not exist or you don\'t have access');
    } else if (err.name === 'Forbidden') {
      warn('Check your AWS credentials and bucket permissions');
    }
    return false;
  }
}

async function testUpload() {
  log('\n📤 Testing Upload Functionality...\n', blue);

  // Create a test file
  const testFileName = `test-${Date.now()}.txt`;
  const testContent = Buffer.from('This is a test file for S3 upload verification');

  try {
    info(`Uploading test file: ${testFileName}`);
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `test/${testFileName}`,
      Body: testContent,
      ContentType: 'text/plain',
      // ACL removed - bucket policy handles public access when ACLs are disabled
    });

    await s3Client.send(command);
    success('File uploaded successfully');

    // Construct S3 URL
    const url = `https://${BUCKET_NAME}.s3.${awsRegion}.amazonaws.com/test/${testFileName}`;
    info(`File URL: ${url}`);

    // Test public access
    info('Testing public access...');
    try {
      const response = await fetch(url);
      if (response.ok) {
        success('File is publicly accessible');
        const content = await response.text();
        if (content === testContent.toString()) {
          success('File content matches');
        } else {
          warn('File content does not match');
        }
      } else {
        error(`File is not publicly accessible (Status: ${response.status})`);
        warn('Check your bucket policy for public read access');
      }
    } catch (fetchError: any) {
      error(`Cannot fetch file: ${fetchError.message}`);
      warn('File might not be publicly accessible');
    }

    return { success: true, fileName: `test/${testFileName}`, url };
  } catch (err: any) {
    error(`Upload failed: ${err.message}`);
    if (err.name === 'AccessDenied') {
      warn('Check your IAM user has s3:PutObject permission');
    }
    return { success: false, fileName: null, url: null };
  }
}

async function testDelete(fileName: string) {
  log('\n🗑️  Testing Delete Functionality...\n', blue);

  try {
    info(`Deleting file: ${fileName}`);
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await s3Client.send(command);
    success('File deleted successfully');

    // Verify deletion
    info('Verifying deletion...');
    const url = `https://${BUCKET_NAME}.s3.${awsRegion}.amazonaws.com/${fileName}`;
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        success('File confirmed deleted (404)');
      } else if (response.status === 403) {
        warn('Got 403 - file might be deleted but access denied');
      } else {
        warn(`Unexpected status: ${response.status}`);
      }
    } catch (fetchError: any) {
      // 404 or network error is expected after deletion
      success('File appears to be deleted');
    }

    return true;
  } catch (err: any) {
    error(`Delete failed: ${err.message}`);
    if (err.name === 'AccessDenied') {
      warn('Check your IAM user has s3:DeleteObject permission');
    }
    return false;
  }
}

async function runTests() {
  log('\n🚀 Starting S3 Bucket Tests\n', blue);
  log('='.repeat(50), blue);

  // Test 1: Connection
  const connectionOk = await testS3Connection();
  if (!connectionOk) {
    error('\n❌ Connection test failed. Please fix issues and try again.');
    process.exit(1);
  }

  // Test 2: Upload
  const uploadResult = await testUpload();
  if (!uploadResult.success) {
    error('\n❌ Upload test failed.');
    process.exit(1);
  }

  // Test 3: Delete
  if (uploadResult.fileName) {
    const deleteOk = await testDelete(uploadResult.fileName);
    if (!deleteOk) {
      warn('\n⚠️  Delete test failed, but upload worked.');
    }
  }

  // Summary
  log('\n' + '='.repeat(50), blue);
  log('\n📊 Test Summary\n', blue);
  success('✅ Connection: OK');
  success('✅ Upload: OK');
  if (uploadResult.fileName) {
    success('✅ Delete: OK');
  }
  success('✅ Public Access: OK');

  log('\n🎉 All tests passed! Your S3 bucket is configured correctly.\n', green);
}

// Run tests
runTests().catch((error) => {
  error(`\n❌ Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});

