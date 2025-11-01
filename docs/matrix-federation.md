# Matrix Federation

Gifable supports Matrix federation, allowing Matrix clients (like Element, Gomuks, FluffyChat, etc.) to use GIFs from your Gifable instance using MXC URIs.

## Overview

Matrix uses MXC (Matrix Content) URIs to reference media across the federated network. These URIs follow the format:

```
mxc://<server-name>/<media-id>
```

For example: `mxc://gifs.example.com/50d66383-21a1-4943-81eb-25cda2ac2e9d`

## How It Works

1. Your Gifable instance acts as a Matrix media server
2. Public media can be referenced using MXC URIs
3. Matrix homeservers fetch media via standard Matrix endpoints
4. The same GIF used multiple times = single MXC URI (no duplicates!)
5. Homeservers cache the media and can purge it independently

## Setup

### 1. Configure Your Domain

Set your `APP_URL` in `.env` to your public domain:

```bash
APP_URL=https://gifs.example.com
```

The hostname from this URL becomes your Matrix server name.

### 2. Ensure Media is Public

Only **public** media is accessible via Matrix federation. Private media will return 404 errors to Matrix homeservers.

### 3. Test the Endpoints

Gifable automatically serves these Matrix endpoints:

**Server Discovery:**
```bash
curl https://gifs.example.com/.well-known/matrix/server
# Returns: {"m.server":"gifs.example.com:443"}
```

**Media Download:**
```bash
curl https://gifs.example.com/_matrix/media/v3/download/gifs.example.com/{mediaId}
# Returns: The media file or a 308 redirect to S3
```

**Thumbnail Download:**
```bash
curl https://gifs.example.com/_matrix/media/v3/thumbnail/gifs.example.com/{mediaId}
# Returns: The thumbnail file or a 308 redirect to S3
```

## Usage in Code

### Generate MXC URIs

Use the helper function to generate MXC URIs for your media:

```typescript
import { getMxcUri } from "~/utils/media.server";

const mediaId = "50d66383-21a1-4943-81eb-25cda2ac2e9d";
const mxcUri = getMxcUri(mediaId);
// Returns: "mxc://gifs.example.com/50d66383-21a1-4943-81eb-25cda2ac2e9d"
```

### Convert MXC URIs to HTTP URLs

Convert MXC URIs back to HTTP URLs for display:

```typescript
import { mxcUriToHttpUrl } from "~/utils/media.server";

const mxcUri = "mxc://gifs.example.com/50d66383-21a1-4943-81eb-25cda2ac2e9d";
const httpUrl = mxcUriToHttpUrl(mxcUri);
// Returns: "https://gifs.example.com/_matrix/media/v3/download/gifs.example.com/50d66383-21a1-4943-81eb-25cda2ac2e9d"
```

## Testing with Matrix Federation Tester

You can test your instance with the Matrix Federation Tester:

1. Visit https://federationtester.matrix.org/
2. Enter your domain (e.g., `gifs.example.com`)
3. The tester will check your `.well-known` endpoint and server configuration

## Example: Using in Matrix Clients

### Element Web

You can use the MXC URIs in Matrix messages. For example, with a custom sticker picker:

```javascript
// Send a GIF as a message
const mediaId = "50d66383-21a1-4943-81eb-25cda2ac2e9d";
const mxcUri = `mxc://gifs.example.com/${mediaId}`;

// In Matrix, this will be rendered as an image
// Matrix clients will fetch it via:
// https://gifs.example.com/_matrix/media/v3/download/gifs.example.com/${mediaId}
```

### Building a Sticker Picker

Similar to [maunium-stickerpicker](https://github.com/maunium/stickerpicker), you can build a custom sticker/GIF picker that:

1. Searches your Gifable instance via the `/api/media` endpoint
2. Returns MXC URIs for selected GIFs
3. Sends them to Matrix rooms

## Performance & Caching

### Redirect Mode (Default)

By default, Gifable returns HTTP 308 redirects to the S3 URLs. This means:

- Matrix homeservers fetch directly from S3
- Reduced bandwidth usage on your Gifable server
- Better performance for end users
- S3's CDN and caching is utilized

### Proxy Mode

If a client sets `allow_redirect=false`, Gifable will proxy the content:

```bash
curl "https://gifs.example.com/_matrix/media/v3/download/gifs.example.com/{mediaId}?allow_redirect=false"
```

This is useful for:
- Clients that don't support redirects
- Additional access control or logging
- Bandwidth monitoring

## Security

- **Only public media** is accessible via Matrix federation
- Private media returns 404 errors (not 403) to avoid leaking existence
- Server name validation prevents serving media for other domains
- CORS headers allow cross-origin access for federation

## Troubleshooting

### 404 Errors in Matrix Clients

**Check:**
1. Is the media marked as public? (`isPublic: true`)
2. Is your APP_URL correctly set?
3. Is the server name in the MXC URI correct?
4. Can you access the `.well-known` endpoint?

### Matrix Federation Tester Fails

**Check:**
1. Is your Gifable instance publicly accessible?
2. Is HTTPS configured correctly?
3. Is the `.well-known` endpoint returning JSON?
4. Are there any firewall or proxy issues?

### Redirects Not Working

**Check:**
1. Is your S3 bucket publicly accessible (or signed URLs enabled)?
2. Are the S3 URLs correct in your database?
3. Are there CORS issues with your S3 bucket?

## References

- [Matrix Content (MXC) URIs Spec](https://spec.matrix.org/latest/client-server-api/#matrix-content-mxc-uris)
- [Matrix Media Repository API](https://spec.matrix.org/latest/client-server-api/#content-repo)
- [Maunium Sticker Picker (with Giphy Proxy)](https://github.com/maunium/stickerpicker/tree/master/giphyproxy)
- [Matrix MXC Proxy Example](https://codeberg.org/austinhuang/matrix-mxc-proxy)
