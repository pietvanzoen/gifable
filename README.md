# Gifable

Gifable is a self hostable gif library manager.

## Features

- Add gifs to your library with searchable comments.
- Find your perfect gif quickly.
- Upload gifs to your S3 compatible bucket.
- Works with javascript disabled.
- Keyboard / accessibility friendly.
- **Matrix Federation** - Share GIFs with Matrix clients (Element, Gomuks, etc.) using MXC URIs.

## Running with docker

Gifable is available as a docker image.

```sh
docker pull ghcr.io/pietvanzoen/gifable:latest
```

To run the image first setup your configuration. Copy the `.env.example` and update as needed.

```sh
curl https://raw.githubusercontent.com/pietvanzoen/gifable/main/.env.example -o .env
```

Then run the image using `--env-file` flag. You'll also want to attach a volume for the database so it is persisted between runs. In this example we're using a directory `/data` to store the database file. You don't need to create the file, the app will create one if it doesn't exist.

```sh
docker run -d \
  --name gifable \
  --env-file=$PWD/.env \
  -v $PWD/data:/data \
  -e DATABASE_URL="file:/data/gifable.db" \
  ghcr.io/pietvanzoen/gifable:latest
```

## Database Support

Gifable supports multiple database providers:

- **SQLite** (default) - Perfect for single-server deployments and development
- **PostgreSQL** - Recommended for production, especially with managed services like Digital Ocean

See [docs/database-providers.md](docs/database-providers.md) for detailed configuration instructions, migration guides, and best practices.

### Quick Start with PostgreSQL

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Set your DATABASE_URL in `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@host:5432/gifable?sslmode=require"
   ```

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Migrating from SQLite to PostgreSQL

**Important:** Keep `prisma/schema.prisma` as SQLite during migration. The script connects to both databases independently.

```bash
# Make sure schema.prisma still has provider = "sqlite"
SQLITE_URL="file:./dev.db" POSTGRES_URL="postgresql://user:password@host:5432/gifable?sslmode=require" npm run migrate:sqlite-to-postgres

# After successful migration, update schema.prisma to:
# provider = "postgresql"
# Then update your .env DATABASE_URL and run:
npx prisma generate
```

See the [database providers documentation](docs/database-providers.md) for detailed instructions.

## Configuration

See `.env.example` for all available configuration options.

## Matrix Federation

Gifable supports Matrix federation, allowing Matrix clients to use your GIFs via MXC URIs (`mxc://`). This enables seamless integration with Matrix messaging platforms like Element, Gomuks, FluffyChat, and more.

### How It Works

- Your Gifable instance acts as a Matrix media server
- Public media can be referenced using `mxc://your-domain.com/media-id` URIs
- Matrix homeservers fetch media via standard Matrix endpoints
- No duplicates - the same GIF = the same MXC URI across all Matrix rooms
- Homeservers cache media and can independently manage cleanup

### Setup

1. **Set your public domain** in `.env`:
   ```bash
   APP_URL=https://gifs.example.com
   ```

2. **Ensure media is public** - Only public media is accessible via federation

3. **That's it!** Matrix endpoints are automatically available:
   - `/.well-known/matrix/server` - Server discovery
   - `/_matrix/media/v3/download/{serverName}/{mediaId}` - Media downloads
   - `/_matrix/media/v3/thumbnail/{serverName}/{mediaId}` - Thumbnails

### Usage

Generate MXC URIs in your code:

```typescript
import { getMxcUri } from "~/utils/media.server";

const mxcUri = getMxcUri(mediaId);
// Returns: "mxc://gifs.example.com/abc-123-def"
```

### Testing

Test your Matrix federation setup:

```bash
# Run the test script
APP_URL=http://localhost:3000 TEST_MEDIA_ID=your-media-id ./scripts/test-matrix-federation.sh

# Or test manually
curl https://gifs.example.com/.well-known/matrix/server
```

For detailed documentation, see:
- [docs/matrix-federation.md](docs/matrix-federation.md) - Complete guide
- [docs/matrix-federation-testing.md](docs/matrix-federation-testing.md) - Testing instructions
