# Test Image Upload

## Endpoint

**POST** `/api/upload`

## Request Format

Send a `multipart/form-data` request with:
- Field name: `image`
- File: Any image file (JPEG, PNG, GIF, WebP)
- Max size: 5MB

## Example: Using curl

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "image=@/path/to/your/image.jpg"
```

## Example: Using JavaScript (Frontend)

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log('Image URL:', data.url);
```

## Success Response

```json
{
  "success": true,
  "url": "https://ttvxlvdlozrzmaatuydu.supabase.co/storage/v1/object/public/posts/images/xxx.jpg",
  "path": "images/xxx.jpg"
}
```

## Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Common Errors

- `No file uploaded` - No file in the request
- `Invalid file type` - File is not an image
- `File size exceeds 5MB limit` - File is too large
- `Upload failed: ...` - Supabase storage error (check policies)

