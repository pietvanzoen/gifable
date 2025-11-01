# Testing Matrix Federation

This document provides testing instructions for the Matrix federation implementation in Gifable.

## Quick Test

### 1. Test Server Discovery Endpoint

```bash
curl http://localhost:3000/.well-known/matrix/server
```

**Expected Response:**
```json
{
  "m.server": "localhost:443"
}
```

### 2. Test Media Download Endpoint

Using the test media ID from your database:

```bash
# Get a test media ID
export TEST_MEDIA_ID="50d66383-21a1-4943-81eb-25cda2ac2e9d"

# Test with redirect (default)
curl -i "http://localhost:3000/_matrix/media/v3/download/localhost/${TEST_MEDIA_ID}"
```

**Expected Response:**
```http
HTTP/1.1 308 Permanent Redirect
Location: https://bucket-644ff1565.sfo3.digitaloceanspaces.com/scrubbles/AeEaw7V.jpg
Cache-Control: public, max-age=86400
```

### 3. Test Media Download Endpoint (Proxy Mode)

```bash
curl -i "http://localhost:3000/_matrix/media/v3/download/localhost/${TEST_MEDIA_ID}?allow_redirect=false"
```

**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: image/jpeg
Cache-Control: public, max-age=86400
Access-Control-Allow-Origin: *

[binary image data]
```

### 4. Test Thumbnail Endpoint

```bash
curl -i "http://localhost:3000/_matrix/media/v3/thumbnail/localhost/${TEST_MEDIA_ID}"
```

**Expected Response:**
```http
HTTP/1.1 308 Permanent Redirect
Location: [thumbnail S3 URL]
Cache-Control: public, max-age=86400
```

## Testing Error Cases

### Test Invalid Server Name

```bash
curl -i "http://localhost:3000/_matrix/media/v3/download/wrong.server/${TEST_MEDIA_ID}"
```

**Expected Response:**
```json
{
  "errcode": "M_NOT_FOUND",
  "error": "This server (localhost) does not serve media for wrong.server"
}
```

### Test Non-Existent Media

```bash
curl -i "http://localhost:3000/_matrix/media/v3/download/localhost/00000000-0000-0000-0000-000000000000"
```

**Expected Response:**
```json
{
  "errcode": "M_NOT_FOUND",
  "error": "Media not found"
}
```

### Test Private Media

```bash
# First, create a private media item, then test
export PRIVATE_MEDIA_ID="[your-private-media-id]"
curl -i "http://localhost:3000/_matrix/media/v3/download/localhost/${PRIVATE_MEDIA_ID}"
```

**Expected Response:**
```json
{
  "errcode": "M_NOT_FOUND",
  "error": "Media not found"
}
```

Note: Private media returns 404 (not 403) to avoid leaking existence.

## Testing Helper Functions

Create a test file `test-mxc.mjs`:

```javascript
import { getMxcUri, mxcUriToHttpUrl } from './app/utils/media.server.ts';

// Test getMxcUri
const mediaId = "50d66383-21a1-4943-81eb-25cda2ac2e9d";
const mxcUri = getMxcUri(mediaId);
console.log("MXC URI:", mxcUri);
// Expected: mxc://localhost/50d66383-21a1-4943-81eb-25cda2ac2e9d

// Test mxcUriToHttpUrl
const httpUrl = mxcUriToHttpUrl(mxcUri);
console.log("HTTP URL:", httpUrl);
// Expected: http://localhost:3000/_matrix/media/v3/download/localhost/50d66383-21a1-4943-81eb-25cda2ac2e9d

// Test invalid MXC URI
const invalidUrl = mxcUriToHttpUrl("mxc://other.server/abc123");
console.log("Invalid URI result:", invalidUrl);
// Expected: null

// Test malformed MXC URI
const malformedUrl = mxcUriToHttpUrl("not-an-mxc-uri");
console.log("Malformed URI result:", malformedUrl);
// Expected: null
```

## Testing with Production Domain

Once deployed with a real domain (e.g., `gifs.example.com`):

### 1. Test Federation Discovery

```bash
curl https://gifs.example.com/.well-known/matrix/server
```

**Expected:**
```json
{
  "m.server": "gifs.example.com:443"
}
```

### 2. Test with Matrix Federation Tester

Visit https://federationtester.matrix.org/ and enter your domain: `gifs.example.com`

The tester will verify:
- ✅ `.well-known` endpoint is accessible
- ✅ Server name is correctly configured
- ✅ HTTPS is working
- ✅ Federation is properly set up

### 3. Test Media Download

```bash
export MEDIA_ID="50d66383-21a1-4943-81eb-25cda2ac2e9d"
curl -I "https://gifs.example.com/_matrix/media/v3/download/gifs.example.com/${MEDIA_ID}"
```

## Testing MXC URIs in Matrix Clients

### Element Web

1. Open Element Web (https://app.element.io)
2. In any room, use the developer tools to send a message with an MXC URI:

```javascript
// In browser console
const mediaId = "50d66383-21a1-4943-81eb-25cda2ac2e9d";
const mxcUri = `mxc://gifs.example.com/${mediaId}`;

// Send an image message
room.sendEvent("m.room.message", {
  msgtype: "m.image",
  body: "Test GIF",
  url: mxcUri
});
```

The image should display in the room, with Element fetching it from your Gifable instance.

### Verify in Network Tab

Open browser DevTools → Network tab, and you should see requests to:
```
https://gifs.example.com/_matrix/media/v3/download/gifs.example.com/[mediaId]
```

Or if your homeserver caches it:
```
https://your-homeserver.com/_matrix/media/v3/download/gifs.example.com/[mediaId]
```

## Automated Testing

Create a test script `scripts/test-matrix-federation.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="${APP_URL:-http://localhost:3000}"
SERVER_NAME=$(echo "$BASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
TEST_MEDIA_ID="${TEST_MEDIA_ID:-50d66383-21a1-4943-81eb-25cda2ac2e9d}"

echo "Testing Matrix Federation Endpoints"
echo "===================================="
echo "Base URL: $BASE_URL"
echo "Server Name: $SERVER_NAME"
echo "Test Media ID: $TEST_MEDIA_ID"
echo ""

# Test 1: Well-known endpoint
echo "Test 1: Server Discovery (.well-known)"
echo "--------------------------------------"
response=$(curl -s "$BASE_URL/.well-known/matrix/server")
echo "$response" | jq .
expected="\"m.server\":\"${SERVER_NAME}:443\""
if echo "$response" | grep -q "$expected"; then
  echo "✅ PASS: Well-known endpoint working"
else
  echo "❌ FAIL: Unexpected response"
fi
echo ""

# Test 2: Media download (redirect mode)
echo "Test 2: Media Download (Redirect Mode)"
echo "---------------------------------------"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_matrix/media/v3/download/${SERVER_NAME}/${TEST_MEDIA_ID}")
if [ "$http_code" = "308" ] || [ "$http_code" = "200" ]; then
  echo "✅ PASS: Media download working (HTTP $http_code)"
else
  echo "❌ FAIL: Unexpected HTTP code: $http_code"
fi
echo ""

# Test 3: Media download (proxy mode)
echo "Test 3: Media Download (Proxy Mode)"
echo "------------------------------------"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_matrix/media/v3/download/${SERVER_NAME}/${TEST_MEDIA_ID}?allow_redirect=false")
if [ "$http_code" = "200" ]; then
  echo "✅ PASS: Media download proxy mode working"
else
  echo "❌ FAIL: Unexpected HTTP code: $http_code"
fi
echo ""

# Test 4: Thumbnail endpoint
echo "Test 4: Thumbnail Download"
echo "--------------------------"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_matrix/media/v3/thumbnail/${SERVER_NAME}/${TEST_MEDIA_ID}")
if [ "$http_code" = "308" ] || [ "$http_code" = "200" ]; then
  echo "✅ PASS: Thumbnail download working (HTTP $http_code)"
else
  echo "❌ FAIL: Unexpected HTTP code: $http_code"
fi
echo ""

# Test 5: Invalid server name
echo "Test 5: Invalid Server Name"
echo "----------------------------"
response=$(curl -s "$BASE_URL/_matrix/media/v3/download/wrong.server/${TEST_MEDIA_ID}")
if echo "$response" | grep -q "M_NOT_FOUND"; then
  echo "✅ PASS: Correctly rejects wrong server name"
else
  echo "❌ FAIL: Should return M_NOT_FOUND error"
fi
echo ""

# Test 6: Non-existent media
echo "Test 6: Non-Existent Media"
echo "--------------------------"
response=$(curl -s "$BASE_URL/_matrix/media/v3/download/${SERVER_NAME}/00000000-0000-0000-0000-000000000000")
if echo "$response" | grep -q "M_NOT_FOUND"; then
  echo "✅ PASS: Correctly returns 404 for non-existent media"
else
  echo "❌ FAIL: Should return M_NOT_FOUND error"
fi
echo ""

echo "===================================="
echo "Testing Complete!"
```

Make it executable and run:

```bash
chmod +x scripts/test-matrix-federation.sh
APP_URL=http://localhost:3000 TEST_MEDIA_ID=50d66383-21a1-4943-81eb-25cda2ac2e9d ./scripts/test-matrix-federation.sh
```

## Expected Behavior Summary

| Endpoint | Expected Response | Status Code |
|----------|------------------|-------------|
| `/.well-known/matrix/server` | JSON with server name | 200 |
| `/_matrix/media/v3/download/{server}/{id}` | 308 redirect to S3 | 308 |
| `/_matrix/media/v3/download/{server}/{id}?allow_redirect=false` | Binary image data | 200 |
| `/_matrix/media/v3/thumbnail/{server}/{id}` | 308 redirect to S3 | 308 |
| Invalid server name | Matrix error JSON | 404 |
| Non-existent media | Matrix error JSON | 404 |
| Private media | Matrix error JSON | 404 |
