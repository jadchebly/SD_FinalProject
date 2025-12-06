# How to Get AWS Access Keys for S3

Follow these steps to create AWS credentials for your S3 bucket.

## Step 1: Log into AWS Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Sign in with your AWS account

## Step 2: Create an IAM User

1. In the AWS Console, search for **"IAM"** in the top search bar
2. Click on **IAM** (Identity and Access Management)
3. In the left sidebar, click **Users**
4. Click **Create user** button (top right)

## Step 3: Configure the User

1. **User name**: Enter a name like `s3-upload-user` or `app-s3-access`
2. **AWS credential type**: Check ✅ **Access key - Programmatic access**
3. **Use case**: 
   - For **local development**: Select **"Local code"**
   - For **Azure deployment**: Select **"Application running outside AWS"** (workloads in other cloud providers)
   - **Note**: You can use the same credentials for both, or create separate users for dev/prod
4. Click **Next: Permissions**

## Step 4: Attach S3 Permissions

You have two options:

### Option A: Attach Existing Policy (Easier)

1. Click **Attach policies directly**
2. In the search box, type: `S3`
3. Find and check ✅ **AmazonS3FullAccess** (or for more security, use `AmazonS3ReadWriteAccess`)
4. Click **Next: Tags** (optional - you can skip)
5. Click **Next: Review**
6. Click **Create user**

### Option B: Custom Policy (More Secure - Recommended)

1. Click **Attach policies directly**
2. Click **Create policy** (opens new tab)
3. Click **JSON** tab
4. Paste this policy (replace `amzn-s3-ie-assignment` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::amzn-s3-ie-assignment",
        "arn:aws:s3:::amzn-s3-ie-assignment/*"
      ]
    }
  ]
}
```

5. Click **Next**
6. **Policy name**: `S3BucketAccessPolicy`
7. Click **Create policy**
8. Go back to the user creation tab
9. Refresh and search for your new policy
10. Check ✅ your policy
11. Click **Next: Tags** → **Next: Review** → **Create user**

## Step 5: Save Your Credentials ⚠️ IMPORTANT

**This is the only time you'll see these credentials!**

1. You'll see a success page with:
   - **Access key ID**: `AKIAIOSFODNN7EXAMPLE` (copy this!)
   - **Secret access key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (copy this!)

2. **⚠️ CRITICAL**: Click **Download .csv** to save them, OR copy both values immediately
3. **⚠️ You cannot view the secret key again** - if you lose it, you'll need to create new keys

## Step 6: Add to Your .env File

1. Go to your backend folder: `SD_FinalProject/backend/`
2. Create or edit `.env` file
3. Add your credentials:

```env
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=amzn-s3-ie-assignment
```

**Replace the example values with your actual keys!**

## Step 7: Secure Your Credentials

1. ✅ **Never commit `.env` to Git** (should already be in `.gitignore`)
2. ✅ **Don't share these keys** publicly
3. ✅ **Keep the CSV file secure** or delete it after adding to `.env`

## Step 8: For Azure Deployment

When you deploy to Azure, you'll need to add these credentials as **Environment Variables** in Azure:

### Option A: Azure App Service (Recommended)

1. Go to your Azure App Service in Azure Portal
2. Navigate to **Configuration** → **Application settings**
3. Add these as **Application settings** (not Connection strings):
   - `AWS_REGION` = `eu-north-1`
   - `AWS_ACCESS_KEY_ID` = `your_access_key`
   - `AWS_SECRET_ACCESS_KEY` = `your_secret_key`
   - `AWS_S3_BUCKET_NAME` = `amzn-s3-ie-assignment`

4. Click **Save** and restart your app

### Option B: Azure Key Vault (More Secure)

For production, consider using Azure Key Vault to store secrets:

1. Create an Azure Key Vault
2. Store your AWS credentials as secrets
3. Configure your app to read from Key Vault
4. Grant your App Service access to the Key Vault

### Best Practice: Separate Credentials

- **Development**: Use one IAM user for local development
- **Production**: Create a separate IAM user for Azure deployment
- This allows you to rotate/revoke credentials independently

## Troubleshooting

### "Access Denied" Error
- Make sure the IAM user has permissions for your bucket
- Check the bucket name matches exactly
- Verify the region is correct (`eu-north-1`)

### "Invalid Credentials" Error
- Double-check you copied the keys correctly (no extra spaces)
- Make sure you're using the Access Key ID (not the Secret Key) in the right place

### Can't Find IAM
- Make sure you're logged into the correct AWS account
- IAM is available in all regions (you can access it from any region)

## Quick Reference

- **Access Key ID**: Starts with `AKIA...` (20 characters)
- **Secret Access Key**: Long random string (40 characters)
- **Region**: `eu-north-1` (Stockholm)
- **Bucket**: `amzn-s3-ie-assignment`

---

## Alternative: Using AWS CLI (If You Have It Installed)

If you have AWS CLI configured, you can also use:

```bash
aws configure
```

But for your app, you still need to add the credentials to `.env` file.

---

**Once you have the keys, add them to your `.env` file and restart your backend server!** 🚀

