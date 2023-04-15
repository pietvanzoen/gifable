#!/bin/sh
# Generate a session key for the secure-session plugin

set -e

keyfile=$(mktemp)

./node_modules/@fastify/secure-session/genkey.js > $keyfile

./_scripts/secret-key-to-hex.js $keyfile

rm $keyfile
