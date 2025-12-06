# S3 Bucket Testing Guide

This guide helps you test and verify your S3 bucket is working correctly.

## Quick Test

### Step 1: Set Up Environment Variables

Make sure your `backend/.env` file has:

```env
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=amzn-s3-ie-assignment
```

### Step 2: Run Test Script

```bash
cd backend
npx ts-node test-s3.ts
```

This will test:
- ✅ S3 connection
- ✅ Upload functionality
- ✅ Public access
- ✅ Delete functionality

---

## Manual Testing

### Test 1: Upload via API

1. Start your backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Test upload endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -F "image=@/path/to/test-image.jpg"
   ```

   Should return:
   ```json
   {
     "success": true,
     "url": "https://amzn-s3-ie-assignment.s3.eu-north-1.amazonaws.com/images/uuid.jpg",
     "path": "images/uuid.jpg"
   }
   ```

3. Open the URL in browser - image should load

### Test 2: Check Bucket in AWS Console

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click your bucket: `amzn-s3-ie-assignment`
3. Check `images/` folder
4. Verify files are there

### Test 3: Test Public Access

1. Copy the URL from upload response
2. Open in browser (incognito/private window)
3. Image should load without authentication

---

## Common Issues & Fixes

### Issue: "Access Denied" Error

**Problem:** IAM user doesn't have permissions

**Fix:**
1. Go to AWS IAM Console
2. Find your IAM user
3. Attach policy: `AmazonS3FullAccess` (or custom policy)
4. Wait 1-2 minutes for permissions to propagate

### Issue: "Bucket Not Found"

**Problem:** Bucket doesn't exist or wrong name

**Fix:**
1. Check bucket name in `.env` matches AWS Console
2. Verify region is correct
3. Check you're using the right AWS account

### Issue: "The bucket does not allow ACLs"

**Problem:** Bucket has ACLs disabled, but code tries to use ACL

**Fix:**
1. ✅ **Already fixed in code** - ACL parameter removed
2. Make sure bucket policy allows public read (see below)
3. Re-run the test: `npm run test:s3`

### Issue: "File Not Publicly Accessible"

**Problem:** Bucket policy doesn't allow public read

**Fix:**
1. Go to S3 Console → Your bucket → **Permissions**
2. **Block public access**: Turn OFF (uncheck all)
3. **Bucket policy**: Add this (required when ACLs are disabled):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::amzn-s3-ie-assignment/*"
    }
  ]
}
```

### Issue: "Invalid Credentials"

**Problem:** Wrong AWS keys

**Fix:**
1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`
2. Check for extra spaces or quotes
3. Regenerate keys in IAM if needed

---

## Verification Checklist

- [ ] Environment variables set in `.env`
- [ ] Test script runs without errors
- [ ] Upload endpoint works (`/api/upload`)
- [ ] Files appear in S3 bucket
- [ ] Files are publicly accessible (open URL in browser)
- [ ] Delete works (when deleting posts)

---

## Expected Test Output

```
🚀 Starting S3 Bucket Tests
==================================================

🔍 Testing S3 Connection...

ℹ️  Checking environment variables...
✅ All environment variables are set
ℹ️  Bucket: amzn-s3-ie-assignment
ℹ️  Region: eu-north-1
ℹ️  Testing bucket access...
✅ Bucket is accessible

📤 Testing Upload Functionality...

ℹ️  Uploading test file: test-1234567890.txt
✅ File uploaded successfully
ℹ️  File URL: https://amzn-s3-ie-assignment.s3.eu-north-1.amazonaws.com/test/test-1234567890.txt
ℹ️  Testing public access...
✅ File is publicly accessible
✅ File content matches

🗑️  Testing Delete Functionality...

ℹ️  Deleting file: test/test-1234567890.txt
✅ File deleted successfully
ℹ️  Verifying deletion...
✅ File confirmed deleted (404)

==================================================

📊 Test Summary

✅ Connection: OK
✅ Upload: OK
✅ Delete: OK
✅ Public Access: OK

🎉 All tests passed! Your S3 bucket is configured correctly.
```

---

## Next Steps

Once tests pass:
1. ✅ Your S3 bucket is ready
2. ✅ You can upload images through your app
3. ✅ Images will be publicly accessible
4. ✅ Ready for Azure deployment

---

**Run the test script to verify everything works!** 🚀

