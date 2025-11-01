#!/usr/bin/env node

/**
 * SQLite to PostgreSQL Migration Script for Gifable
 *
 * This script migrates all data from a SQLite database to PostgreSQL.
 * It preserves all users, media items, relationships, and metadata.
 *
 * Usage:
 *   1. Set up environment variables:
 *      SQLITE_URL="file:./dev.db"
 *      POSTGRES_URL="postgresql://user:pass@host:5432/db?sslmode=require"
 *
 *   2. Run the script:
 *      node scripts/migrate-sqlite-to-postgres.js
 *
 * Or use command line arguments:
 *   node scripts/migrate-sqlite-to-postgres.js "file:./dev.db" "postgresql://..."
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, colors.bright);
  log(message, colors.bright);
  log('='.repeat(60), colors.bright);
}

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question} (yes/no): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function runCommand(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  logSection('Gifable: SQLite to PostgreSQL Migration');

  // Get database URLs from environment or command line
  const sqliteUrl = process.argv[2] || process.env.SQLITE_URL;
  const postgresUrl = process.argv[3] || process.env.POSTGRES_URL;

  if (!sqliteUrl) {
    logError('SQLite database URL not provided!');
    logInfo('Set SQLITE_URL environment variable or pass as first argument');
    logInfo('Example: SQLITE_URL="file:./dev.db" POSTGRES_URL="postgresql://..." node scripts/migrate-sqlite-to-postgres.js');
    logInfo('Or: node scripts/migrate-sqlite-to-postgres.js "file:./dev.db" "postgresql://..."');
    process.exit(1);
  }

  if (!postgresUrl) {
    logError('PostgreSQL database URL not provided!');
    logInfo('Set POSTGRES_URL environment variable or pass as second argument');
    logInfo('Example: SQLITE_URL="file:./dev.db" POSTGRES_URL="postgresql://..." node scripts/migrate-sqlite-to-postgres.js');
    process.exit(1);
  }

  // Validate URLs
  if (!sqliteUrl.startsWith('file:')) {
    logError('SQLite URL must start with "file:"');
    process.exit(1);
  }

  if (!postgresUrl.startsWith('postgresql://') && !postgresUrl.startsWith('postgres://')) {
    logError('PostgreSQL URL must start with "postgresql://" or "postgres://"');
    process.exit(1);
  }

  logInfo(`SQLite source: ${sqliteUrl}`);
  logInfo(`PostgreSQL target: ${postgresUrl.replace(/:[^:@]+@/, ':***@')}`);

  // Warning and confirmation
  log('');
  logWarning('WARNING: This will copy all data from SQLite to PostgreSQL.');
  logWarning('The PostgreSQL database should be empty before running this.');
  logWarning('Make sure you have backed up your data!');
  log('');

  const confirmed = await askConfirmation('Do you want to continue?');
  if (!confirmed) {
    logInfo('Migration cancelled.');
    process.exit(0);
  }

  // Set up PostgreSQL database
  logSection('Setting Up PostgreSQL Database');

  try {
    logInfo('Creating tables in PostgreSQL database...');
    logInfo('Using db push to create schema (no migration history needed).');
    await runCommand('npx', [
      'prisma',
      'db',
      'push',
      '--schema=prisma/schema-postgres.prisma',
      '--skip-generate',
      '--accept-data-loss'
    ], { POSTGRES_URL: postgresUrl });
    logSuccess('PostgreSQL database schema created');
  } catch (error) {
    logError(`Failed to set up PostgreSQL database: ${error.message}`);
    logError('Make sure your PostgreSQL database is accessible and empty.');
    process.exit(1);
  }

  // Generate Prisma clients
  logSection('Generating Prisma Clients');

  try {
    logInfo('Generating PostgreSQL Prisma client...');
    await runCommand('npx', [
      'prisma',
      'generate',
      '--schema=prisma/schema-postgres.prisma'
    ], { POSTGRES_URL: postgresUrl });
    logSuccess('PostgreSQL client generated');

    logInfo('Generating SQLite Prisma client (default)...');
    await runCommand('npx', [
      'prisma',
      'generate'
    ], { DATABASE_URL: sqliteUrl });
    logSuccess('SQLite client generated');
  } catch (error) {
    logError(`Failed to generate Prisma clients: ${error.message}`);
    process.exit(1);
  }

  // Now dynamically import the clients
  logSection('Connecting to Databases');

  let sourceDb, targetDb;

  try {
    logInfo('Loading Prisma clients...');

    // Import the regular client for SQLite
    const { PrismaClient: SQLitePrismaClient } = require('@prisma/client');
    sourceDb = new SQLitePrismaClient({
      datasources: {
        db: { url: sqliteUrl }
      }
    });

    // Import the postgres client
    const { PrismaClient: PostgresPrismaClient } = require('../node_modules/.prisma/client-postgres');
    targetDb = new PostgresPrismaClient({
      datasources: {
        db: { url: postgresUrl }
      }
    });

    logInfo('Connecting to SQLite...');
    await sourceDb.$connect();
    logSuccess('Connected to SQLite');

    logInfo('Connecting to PostgreSQL...');
    await targetDb.$connect();
    logSuccess('Connected to PostgreSQL');
  } catch (error) {
    logError(`Failed to connect to databases: ${error.message}`);
    if (sourceDb) await sourceDb.$disconnect().catch(() => {});
    if (targetDb) await targetDb.$disconnect().catch(() => {});
    process.exit(1);
  }

  try {
    // Check if target database is empty
    logSection('Checking Target Database');

    const existingUsers = await targetDb.user.count();
    const existingMedia = await targetDb.media.count();

    if (existingUsers > 0 || existingMedia > 0) {
      logWarning(`Target database is not empty: ${existingUsers} users, ${existingMedia} media items`);
      const continueAnyway = await askConfirmation('Continue anyway? This may cause conflicts.');
      if (!continueAnyway) {
        logInfo('Migration cancelled.');
        process.exit(0);
      }
    } else {
      logSuccess('Target database is empty. Ready to migrate.');
    }

    // Get source data counts
    logSection('Analyzing Source Database');

    const sourceUsers = await sourceDb.user.findMany();
    const sourceMedia = await sourceDb.media.findMany();

    logInfo(`Found ${sourceUsers.length} users`);
    logInfo(`Found ${sourceMedia.length} media items`);

    if (sourceUsers.length === 0 && sourceMedia.length === 0) {
      logWarning('Source database is empty. Nothing to migrate.');
      process.exit(0);
    }

    // Migrate Users
    logSection('Migrating Users');

    let migratedUsers = 0;
    let failedUsers = 0;

    for (const user of sourceUsers) {
      try {
        await targetDb.user.create({
          data: {
            id: user.id,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            username: user.username,
            passwordHash: user.passwordHash,
            isAdmin: user.isAdmin,
            lastLogin: user.lastLogin,
            apiToken: user.apiToken,
            preferredLabels: user.preferredLabels,
            theme: user.theme,
          },
        });
        migratedUsers++;
        process.stdout.write(`\r${colors.cyan}Migrated ${migratedUsers}/${sourceUsers.length} users${colors.reset}`);
      } catch (error) {
        failedUsers++;
        logError(`\nFailed to migrate user ${user.username}: ${error.message}`);
      }
    }

    console.log(''); // New line after progress
    logSuccess(`Migrated ${migratedUsers} users`);
    if (failedUsers > 0) {
      logWarning(`Failed to migrate ${failedUsers} users`);
    }

    // Migrate Media
    logSection('Migrating Media');

    let migratedMedia = 0;
    let failedMedia = 0;

    for (const media of sourceMedia) {
      try {
        await targetDb.media.create({
          data: {
            id: media.id,
            createdAt: media.createdAt,
            updatedAt: media.updatedAt,
            url: media.url,
            thumbnailUrl: media.thumbnailUrl,
            fileHash: media.fileHash,
            labels: media.labels,
            altText: media.altText,
            width: media.width,
            height: media.height,
            color: media.color,
            size: media.size,
            isPublic: media.isPublic,
            userId: media.userId,
          },
        });
        migratedMedia++;
        process.stdout.write(`\r${colors.cyan}Migrated ${migratedMedia}/${sourceMedia.length} media items${colors.reset}`);
      } catch (error) {
        failedMedia++;
        logError(`\nFailed to migrate media ${media.id}: ${error.message}`);
      }
    }

    console.log(''); // New line after progress

    // Summary
    logSection('Migration Summary');

    logSuccess(`Users: ${migratedUsers}/${sourceUsers.length} migrated`);
    logSuccess(`Media: ${migratedMedia}/${sourceMedia.length} migrated`);

    if (failedUsers > 0 || failedMedia > 0) {
      logWarning(`\nSome items failed to migrate:`);
      if (failedUsers > 0) logWarning(`  - ${failedUsers} users`);
      if (failedMedia > 0) logWarning(`  - ${failedMedia} media items`);
      logInfo('\nCheck the error messages above for details.');
    }

    // Verification
    logSection('Verifying Migration');

    const targetUserCount = await targetDb.user.count();
    const targetMediaCount = await targetDb.media.count();

    logInfo(`Target database now has:`);
    logInfo(`  - ${targetUserCount} users`);
    logInfo(`  - ${targetMediaCount} media items`);

    if (targetUserCount === sourceUsers.length && targetMediaCount === sourceMedia.length) {
      logSuccess('\n✓ Migration completed successfully!');
      logInfo('\nNext steps:');
      logInfo('1. Update your prisma/schema.prisma to use "postgresql" provider');
      logInfo('2. Update your .env file with the PostgreSQL DATABASE_URL');
      logInfo('3. Run: npx prisma generate');
      logInfo('4. Test your application thoroughly');
      logInfo('5. Keep your SQLite backup until you\'re confident everything works');
    } else {
      logWarning('\n⚠ Migration completed with some data missing.');
      logWarning('Please review the errors above and verify your data manually.');
    }

  } catch (error) {
    logError(`\nMigration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    // Disconnect
    logInfo('\nClosing database connections...');
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
    logSuccess('Disconnected from databases.');
  }
}

// Run the migration
main()
  .catch((error) => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
