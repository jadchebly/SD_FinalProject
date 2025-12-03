#!/bin/bash
# Test signup endpoint with curl

curl -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "testuser123@example.com",
    "password": "password123"
  }' | jq .

echo ""
echo "To test with a different user, modify the JSON above"
