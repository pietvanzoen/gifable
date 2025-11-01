# Database Providers - Complete Self-Hosting Guide

Gifable supports multiple database providers to accommodate different deployment scenarios and performance requirements. This guide provides comprehensive instructions for self-hosters.

## Quick Start

Gifable uses an environment variable to configure which database provider to use:

```bash
# In your .env file
DATABASE_PROVIDER="sqlite"    # or "postgresql"
DATABASE_URL="file:./dev.db"  # or your PostgreSQL connection string
```

The `DATABASE_PROVIDER` variable automatically configures Prisma to use the correct database type.

## Supported Databases

| Database | Best For | Complexity | Concurrency |
|----------|----------|------------|-------------|
| **SQLite** | Single server, development, small-medium workloads | ⭐ Easy | Limited |
| **PostgreSQL** | Production, high traffic, distributed systems | ⭐⭐⭐ Moderate | Excellent |

---

## SQLite Setup (Default)

SQLite is the default database provider and requires minimal configuration. Perfect for getting started quickly.

### Step-by-Step Setup

**1. Configure your environment variables:**

Create or edit your `.env` file:
```bash
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"
```

**2. Setup the database provider:**

This configures Prisma to use SQLite:
```bash
npm run setup-db-provider
# Or manually:
DATABASE_PROVIDER=sqlite node scripts/setup-database-provider.js
```

**3. Generate Prisma client:**
```bash
npx prisma generate
```

**4. Run migrations to create tables:**
```bash
npx prisma migrate deploy
```

**5. (Optional) Seed an admin user:**

Set these in your `.env`:
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

**6. Start the application:**
```bash
npm run dev    # Development
npm start      # Production
```

### SQLite File Location

By default, the database is created at `prisma/dev.db` relative to your project root.

You can change this:
```bash
# Absolute path
DATABASE_URL="file:/var/lib/gifable/database.db"

# Relative path (relative to prisma/ directory)
DATABASE_URL="file:./my-custom.db"
```

### Backup SQLite

Simply copy the database file:
```bash
# Backup
cp prisma/dev.db prisma/dev.db.backup

# Restore
cp prisma/dev.db.backup prisma/dev.db
```

### Pros & Cons

✅ **Pros:**
- Zero external dependencies
- No database server required
- Extremely easy to backup (just copy the file)
- Fast for read-heavy workloads
- Perfect for single-server deployments

❌ **Cons:**
- Not suitable for distributed/multi-server deployments
- Limited write concurrency
- File-based, requires file system access for backups
- Not recommended for high-traffic production

---

## PostgreSQL Setup

PostgreSQL is recommended for production deployments, especially with managed database services.

### Prerequisites

- A PostgreSQL 12+ database (version 16 recommended)
- Database credentials (username, password, hostname, port)
- For managed services: connection string from provider

### Step-by-Step Setup (New Installation)

**1. Create a PostgreSQL database:**

Using your database provider's interface, create a new database. For example:
- **Digital Ocean:** Create a PostgreSQL cluster, note the connection details
- **Self-hosted:** `createdb gifable`
- **Docker:** Use a PostgreSQL container

**2. Get your connection string:**

Format:
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

Examples:
```bash
# Digital Ocean
postgresql://doadmin:password@db-postgresql-nyc3-12345.ondigitalocean.com:25060/gifable?sslmode=require

# Local PostgreSQL
postgresql://postgres:password@localhost:5432/gifable

# Docker PostgreSQL
postgresql://postgres:password@postgres:5432/gifable
```

**3. Configure environment variables:**

Edit your `.env` file:
```bash
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:password@host:5432/gifable?sslmode=require"
APP_URL="https://your-domain.com"

# S3 Configuration
S3_ENDPOINT="your-s3-endpoint"
S3_BUCKET="your-bucket"
# ... etc
```

**4. Setup the database provider:**

This updates Prisma schema to use PostgreSQL:
```bash
npm run setup-db-provider
# Or manually:
DATABASE_PROVIDER=postgresql node scripts/setup-database-provider.js
```

You should see:
```
✓ Updated database provider: sqlite → postgresql
```

**5. Generate Prisma client:**
```bash
npx prisma generate
```

**6. Create database tables:**

Run migrations to set up the schema:
```bash
npx prisma migrate deploy
```

This creates all necessary tables (User, Media, etc.) in your PostgreSQL database.

**7. (Optional) Seed an admin user:**

Set these in your `.env`:
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

The admin will be created automatically on first start.

**8. Start the application:**
```bash
npm start
```

### PostgreSQL Connection String Parameters

#### SSL Configuration

**Require SSL (Recommended for Production):**
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**Self-Signed Certificates:**

Some providers (like Digital Ocean) use self-signed certificates:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&sslaccept=accept_invalid_certs"
```

**No SSL (Development Only):**
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
```

#### Connection Pool Settings

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=20&pool_timeout=20"
```

- `connection_limit=20` - Maximum connections (default: unlimited)
- `pool_timeout=20` - Timeout in seconds (default: 10)

#### Schema Selection

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"
```

### Pros & Cons

✅ **Pros:**
- Excellent for production environments
- Superior write concurrency
- ACID compliant with advanced features
- Works great with managed services (Digital Ocean, AWS RDS, etc.)
- Easy to scale horizontally
- Hot backups without downtime

❌ **Cons:**
- Requires external database server
- More complex setup
- Additional infrastructure cost
- Requires network access to database

---

## Running Migrations

### Understanding Migrations

Migrations are version-controlled changes to your database schema. Gifable includes all necessary migrations in the `prisma/migrations/` directory.

### Deploy Migrations (Production)

Use this command to apply all pending migrations:

```bash
npx prisma migrate deploy
```

This is **idempotent** - safe to run multiple times. It only applies migrations that haven't been run yet.

**When to use:**
- First time setting up your database
- After pulling new code with database changes
- When deploying updates to production

### Reset Database (Development Only)

⚠️ **WARNING:** This deletes ALL data!

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Recreate it
3. Apply all migrations
4. Run seed script (if configured)

**Never use this in production!**

### Create New Migration (Developers Only)

If you're developing new features that require schema changes:

```bash
npx prisma migrate dev --name your_migration_name
```

### Check Migration Status

See which migrations have been applied:

```bash
npx prisma migrate status
```

---

## Switching Database Providers

### From SQLite to PostgreSQL (Migration)

**Step 1: Set up PostgreSQL database**

Create your PostgreSQL database and get the connection string.

**Step 2: Run the migration script**

This copies all data from SQLite to PostgreSQL:

```bash
SQLITE_URL="file:./dev.db" \
POSTGRES_URL="postgresql://user:pass@host:5432/gifable?sslmode=require" \
npm run migrate:sqlite-to-postgres
```

The script will:
- ✅ Create PostgreSQL schema
- ✅ Copy all users
- ✅ Copy all media items
- ✅ Preserve all relationships and metadata
- ✅ Maintain timestamps and settings

**Step 3: Update your configuration**

Edit `.env`:
```bash
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:pass@host:5432/gifable?sslmode=require"
```

**Step 4: Update Prisma schema**

```bash
npm run setup-db-provider
```

**Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

**Step 6: Test your application**

```bash
npm start
```

**Step 7: Backup your SQLite file**

Keep your `dev.db` file as a backup until you're confident everything works!

### From PostgreSQL to SQLite (Not Recommended)

While technically possible, moving from PostgreSQL back to SQLite is not recommended for production systems. If you must:

1. Export your data using `pg_dump`
2. Set up a new SQLite database
3. Write a custom import script
4. Update configuration as shown in SQLite setup section

---

## Docker Deployment

### Using SQLite with Docker

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  gifable:
    image: ghcr.io/pietvanzoen/gifable:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    environment:
      - DATABASE_PROVIDER=sqlite
      - DATABASE_URL=file:/data/gifable.db
      - APP_URL=https://your-domain.com
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_BUCKET=${S3_BUCKET}
      # ... other S3 config
    env_file:
      - .env
```

### Using PostgreSQL with Docker

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=gifable
      - POSTGRES_USER=gifable
      - POSTGRES_PASSWORD=your_secure_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gifable"]
      interval: 10s
      timeout: 5s
      retries: 5

  gifable:
    image: ghcr.io/pietvanzoen/gifable:latest
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - DATABASE_PROVIDER=postgresql
      - DATABASE_URL=postgresql://gifable:your_secure_password@postgres:5432/gifable
      - APP_URL=https://your-domain.com
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_BUCKET=${S3_BUCKET}
      # ... other S3 config
    env_file:
      - .env

volumes:
  postgres_data:
```

Start with:
```bash
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

#### "Error validating datasource: the URL must start with protocol `file:`"

**Problem:** Your `DATABASE_PROVIDER` doesn't match your `DATABASE_URL`.

**Solution:**
```bash
# Make sure these match:
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://..."

# Then run:
npm run setup-db-provider
npx prisma generate
```

#### "The table `public.User` does not exist"

**Problem:** Database tables haven't been created.

**Solution:**
```bash
npx prisma migrate deploy
```

#### "Connection refused" (PostgreSQL)

**Problem:** Can't connect to PostgreSQL server.

**Solutions:**
- Check hostname and port
- Verify PostgreSQL is running
- Check firewall rules
- Verify credentials

#### "SSL connection required"

**Problem:** PostgreSQL requires SSL but connection string doesn't specify it.

**Solution:**
```bash
# Add ?sslmode=require to your connection string
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

#### "Certificate verify failed"

**Problem:** Self-signed certificate not accepted.

**Solution:**
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&sslaccept=accept_invalid_certs"
```

#### "Database locked" (SQLite)

**Problem:** Multiple processes accessing SQLite simultaneously.

**Solutions:**
- Only run one instance of the application
- Check for stale lock files
- Consider using PostgreSQL for multi-process deployments

### Getting Help

Check migration status:
```bash
npx prisma migrate status
```

View Prisma schema:
```bash
cat prisma/schema.prisma
```

Test database connection:
```bash
npx prisma db execute --stdin <<< "SELECT 1"
```

---

## Best Practices

### Development

- ✅ Use SQLite for local development
- ✅ Use same database type as production if possible
- ✅ Keep migrations in version control
- ✅ Test migrations before deploying

### Production

- ✅ Use PostgreSQL for production
- ✅ Enable SSL for database connections
- ✅ Use managed database services (Digital Ocean, AWS RDS, etc.)
- ✅ Configure connection pooling
- ✅ Set up regular backups
- ✅ Monitor database performance
- ✅ Use strong passwords
- ✅ Restrict database access to your application only

### Backups

**SQLite:**
```bash
# Automated backup script
cp prisma/dev.db "backups/backup-$(date +%Y%m%d-%H%M%S).db"
```

**PostgreSQL:**
```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup.sql

# Automated with managed service
# Use your provider's backup tools (recommended)
```

### Performance Optimization

**SQLite:**
- Enable WAL mode (included by default in Gifable)
- Keep database file on fast storage (SSD)
- Limit to single-server deployments

**PostgreSQL:**
- Configure connection pooling (20-50 connections typical)
- Use connection limits in DATABASE_URL
- Regular VACUUM and ANALYZE
- Monitor query performance
- Consider read replicas for high traffic

---

## Environment Variables Reference

Complete list of database-related environment variables:

```bash
# Database Configuration
DATABASE_PROVIDER="sqlite"           # or "postgresql"
DATABASE_URL="file:./dev.db"        # or postgresql://...

# Application URL (required)
APP_URL="https://your-domain.com"

# Optional: Admin seeding
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="secure-password"

# S3 Storage (required)
S3_ENDPOINT="s3.amazonaws.com"
S3_BUCKET="my-bucket"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_STORAGE_BASE_URL="https://my-bucket.s3.amazonaws.com"
S3_REGION="us-east-1"
S3_DEFAULT_ACL="private"           # optional, defaults to private

# Other
SESSION_SECRET="random-secret-string"
DEBUG="app:*"                        # optional, for debugging
MAX_FILE_SIZE="20MB"                # optional, defaults to 10MB
DISABLE_SIGNUP="1"                  # optional, disable public registration
```

---

## Summary: Quick Commands

### Initial Setup (SQLite)
```bash
DATABASE_PROVIDER=sqlite npm run setup-db-provider
npx prisma generate
npx prisma migrate deploy
npm start
```

### Initial Setup (PostgreSQL)
```bash
DATABASE_PROVIDER=postgresql npm run setup-db-provider
npx prisma generate
npx prisma migrate deploy
npm start
```

### Migrate SQLite → PostgreSQL
```bash
SQLITE_URL="file:./dev.db" POSTGRES_URL="postgresql://..." npm run migrate:sqlite-to-postgres
DATABASE_PROVIDER=postgresql npm run setup-db-provider
npx prisma generate
npm start
```

### Update After Code Changes
```bash
git pull
npm install
npx prisma migrate deploy
npm start
```

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Digital Ocean Managed PostgreSQL](https://www.digitalocean.com/products/managed-databases-postgresql)
- [Gifable GitHub Repository](https://github.com/pietvanzoen/gifable)
