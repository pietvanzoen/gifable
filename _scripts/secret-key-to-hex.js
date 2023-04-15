#!/usr/bin/env node
// Usage: secret-key-to-hex.js <path to key file>
'use strict'

const fs = require('fs');

const keyBuffer = fs.readFileSync(process.argv[2]);
const hexString = keyBuffer.toString('hex');
process.stdout.write(hexString)
