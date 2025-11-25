#!/bin/bash
# VTC ERP API Test Script
# Usage: ./test-api.sh [SESSION_TOKEN]
#
# Before running:
# 1. Start the dev server: pnpm dev
# 2. Login via the web app (http://localhost:3000)
# 3. Get your session token from browser cookies (better-auth.session_token)
# 4. Run: ./test-api.sh YOUR_SESSION_TOKEN

BASE_URL="http://localhost:3000/api"
SESSION_TOKEN="${1:-}"

echo "=========================================="
echo "VTC ERP API Test Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local data="$5"
    
    echo -n "Testing: $name... "
    
    if [ -z "$SESSION_TOKEN" ]; then
        COOKIE_HEADER=""
    else
        COOKIE_HEADER="-H \"Cookie: better-auth.session_token=$SESSION_TOKEN\""
    fi
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
            -H "Cookie: better-auth.session_token=$SESSION_TOKEN" 2>/dev/null)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL$endpoint" \
            -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" \
            -H "Cookie: better-auth.session_token=$SESSION_TOKEN" 2>/dev/null)
    fi
    
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (HTTP $status_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAILED${NC} (Expected $expected_status, got $status_code)"
        echo "   Response: $body"
        ((FAILED++))
        return 1
    fi
}

echo "----------------------------------------"
echo "1. UNAUTHENTICATED ACCESS TESTS"
echo "----------------------------------------"
echo ""

# Clear session for unauthenticated tests
OLD_TOKEN=$SESSION_TOKEN
SESSION_TOKEN=""

test_endpoint "GET /vtc/contacts without auth" "GET" "/vtc/contacts" "401"
test_endpoint "GET /vtc/vehicles without auth" "GET" "/vtc/vehicles" "401"
test_endpoint "GET /vtc/quotes without auth" "GET" "/vtc/quotes" "401"

# Restore session
SESSION_TOKEN=$OLD_TOKEN

echo ""
echo "----------------------------------------"
echo "2. AUTHENTICATED ACCESS TESTS"
echo "----------------------------------------"
echo ""

if [ -z "$SESSION_TOKEN" ]; then
    echo -e "${YELLOW}Skipping authenticated tests - no session token provided${NC}"
    echo ""
    echo "To run authenticated tests:"
    echo "  1. Start dev server: pnpm dev"
    echo "  2. Login via web app"
    echo "  3. Get session token from cookies"
    echo "  4. Run: ./test-api.sh YOUR_SESSION_TOKEN"
else
    # Test list endpoints
    test_endpoint "GET /vtc/contacts" "GET" "/vtc/contacts" "200"
    test_endpoint "GET /vtc/vehicles" "GET" "/vtc/vehicles" "200"
    test_endpoint "GET /vtc/quotes" "GET" "/vtc/quotes" "200"
    
    # Test create contact
    echo ""
    echo "Creating test contact..."
    CONTACT_DATA='{"displayName":"Test Contact API","type":"INDIVIDUAL","email":"test@api.com"}'
    response=$(curl -s -X POST "$BASE_URL/vtc/contacts" \
        -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$CONTACT_DATA" 2>/dev/null)
    
    CONTACT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$CONTACT_ID" ]; then
        echo -e "${GREEN}Created contact: $CONTACT_ID${NC}"
        
        # Test get single contact
        test_endpoint "GET /vtc/contacts/:id" "GET" "/vtc/contacts/$CONTACT_ID" "200"
        
        # Test update contact
        test_endpoint "PATCH /vtc/contacts/:id" "PATCH" "/vtc/contacts/$CONTACT_ID" "200" '{"displayName":"Updated Contact"}'
        
        # Test delete contact
        test_endpoint "DELETE /vtc/contacts/:id" "DELETE" "/vtc/contacts/$CONTACT_ID" "200"
        
        # Test get deleted contact (should be 404)
        test_endpoint "GET deleted contact (should 404)" "GET" "/vtc/contacts/$CONTACT_ID" "404"
    else
        echo -e "${RED}Failed to create contact${NC}"
        echo "Response: $response"
        ((FAILED++))
    fi
    
    # Test cross-tenant access (fake ID)
    echo ""
    echo "Testing cross-tenant protection..."
    test_endpoint "GET /vtc/contacts/:fake_id" "GET" "/vtc/contacts/fake_nonexistent_id" "404"
fi

echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
