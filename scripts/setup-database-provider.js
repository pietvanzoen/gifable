#!/usr/bin/env node

/**
 * Setup Database Provider Script
 *
 * This script updates the Prisma schema to use the correct database provider
 * based on the DATABASE_PROVIDER environment variable.
 *
 * Supported providers: sqlite (default), postgresql
 */

const fs = require('fs');
const path = require('path');

// Get provider from environment variable or default to sqlite
const provider = (process.env.DATABASE_PROVIDER || 'sqlite').toLowerCase();

// Validate provider
const validProviders = ['sqlite', 'postgresql'];
if (!validProviders.includes(provider)) {
  console.error(`❌ Invalid DATABASE_PROVIDER: "${provider}"`);
  console.error(`   Must be one of: ${validProviders.join(', ')}`);
  process.exit(1);
}

// Read schema file
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace the provider line
const providerRegex = /provider\s*=\s*"(sqlite|postgresql)"/;
const currentMatch = schema.match(providerRegex);

if (!currentMatch) {
  console.error('❌ Could not find provider in schema.prisma');
  process.exit(1);
}

const currentProvider = currentMatch[1];

if (currentProvider === provider) {
  console.log(`✓ Database provider already set to: ${provider}`);
  process.exit(0);
}

// Update the provider
schema = schema.replace(providerRegex, `provider = "${provider}"`);

// Write back to file
fs.writeFileSync(schemaPath, schema, 'utf8');

console.log(`✓ Updated database provider: ${currentProvider} → ${provider}`);
