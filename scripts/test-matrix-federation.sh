#!/bin/bash

# Matrix Federation Test Script
# ==============================
# Tests all Matrix federation endpoints for Gifable

# Configuration
BASE_URL="${APP_URL:-http://localhost:3000}"
SERVER_NAME=$(echo "$BASE_URL" | sed -e 's|^[^/]*//||' -e 's|:.*||' -e 's|/.*$||')
TEST_MEDIA_ID="${TEST_MEDIA_ID:-50d66383-21a1-4943-81eb-25cda2ac2e9d}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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
echo "Response: $response"
if echo "$response" | grep -q "m.server"; then
  echo -e "${GREEN}✅ PASS${NC}: Well-known endpoint working"
else
  echo -e "${RED}❌ FAIL${NC}: Unexpected response"
fi
echo ""

# Test 2: Media download (redirect mode)
echo "Test 2: Media Download (Redirect Mode)"
echo "---------------------------------------"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_matrix/media/v3/download/${SERVER_NAME}/${TEST_MEDIA_ID}")
echo "HTTP Status: $http_code"
if [ "$http_code" = "308" ] || [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Media download working (HTTP $http_code)"
else
  echo -e "${RED}❌ FAIL${NC}: Unexpected HTTP code: $http_code"
fi
echo ""

# Test 3: Media download (proxy mode)
echo "Test 3: Media Download (Proxy Mode)"
echo "------------------------------------"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_matrix/media/v3/download/${SERVER_NAME}/${TEST_MEDIA_ID}?allow_redirect=false")
echo "HTTP Status: $http_code"
if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Media download proxy mode working"
else
  echo -e "${RED}❌ FAIL${NC}: Unexpected HTTP code: $http_code"
fi
echo ""

# Test 4: Thumbnail endpoint
echo "Test 4: Thumbnail Download"
echo "--------------------------"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_matrix/media/v3/thumbnail/${SERVER_NAME}/${TEST_MEDIA_ID}")
echo "HTTP Status: $http_code"
if [ "$http_code" = "308" ] || [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Thumbnail download working (HTTP $http_code)"
else
  echo -e "${RED}❌ FAIL${NC}: Unexpected HTTP code: $http_code"
fi
echo ""

# Test 5: Invalid server name
echo "Test 5: Invalid Server Name"
echo "----------------------------"
response=$(curl -s "$BASE_URL/_matrix/media/v3/download/wrong.server/${TEST_MEDIA_ID}")
echo "Response: $response"
if echo "$response" | grep -q "M_NOT_FOUND"; then
  echo -e "${GREEN}✅ PASS${NC}: Correctly rejects wrong server name"
else
  echo -e "${RED}❌ FAIL${NC}: Should return M_NOT_FOUND error"
fi
echo ""

# Test 6: Non-existent media
echo "Test 6: Non-Existent Media"
echo "--------------------------"
response=$(curl -s "$BASE_URL/_matrix/media/v3/download/${SERVER_NAME}/00000000-0000-0000-0000-000000000000")
echo "Response: $response"
if echo "$response" | grep -q "M_NOT_FOUND"; then
  echo -e "${GREEN}✅ PASS${NC}: Correctly returns 404 for non-existent media"
else
  echo -e "${RED}❌ FAIL${NC}: Should return M_NOT_FOUND error"
fi
echo ""

echo "===================================="
echo "Testing Complete!"
