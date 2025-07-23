#!/bin/bash

# YouTube Transcript Proxy - Railway Deployment Test Script
# Usage: ./test-deployment.sh <railway-url>

RAILWAY_URL=$1

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Error: Please provide Railway URL"
    echo "Usage: ./test-deployment.sh <railway-url>"
    echo "Example: ./test-deployment.sh https://your-app.up.railway.app"
    exit 1
fi

echo "🔍 Testing Railway Deployment: $RAILWAY_URL"
echo "================================"

# Test 1: Basic connectivity
echo -e "\n1️⃣ Testing basic connectivity..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" $RAILWAY_URL
echo ""

# Test 2: Root endpoint with full response
echo -e "\n2️⃣ Testing root endpoint (/)..."
echo "Request: GET $RAILWAY_URL/"
echo "Response:"
curl -s -X GET $RAILWAY_URL/ | jq . 2>/dev/null || curl -s -X GET $RAILWAY_URL/
echo ""

# Test 3: Health endpoint
echo -e "\n3️⃣ Testing health endpoint (/health)..."
echo "Request: GET $RAILWAY_URL/health"
echo "Response:"
curl -s -X GET $RAILWAY_URL/health
echo -e "\n"

# Test 4: Check response headers
echo -e "\n4️⃣ Checking response headers..."
curl -s -I $RAILWAY_URL/ | head -n 20
echo ""

# Test 5: OPTIONS request for CORS
echo -e "\n5️⃣ Testing CORS (OPTIONS request)..."
curl -s -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I $RAILWAY_URL/channel | grep -E "(Access-Control|HTTP)"
echo ""

# Test 6: POST to channel endpoint without body
echo -e "\n6️⃣ Testing channel endpoint (no body)..."
echo "Request: POST $RAILWAY_URL/channel"
curl -s -X POST \
  -H "Content-Type: application/json" \
  $RAILWAY_URL/channel | jq . 2>/dev/null || curl -s -X POST -H "Content-Type: application/json" $RAILWAY_URL/channel
echo ""

# Test 7: Try different paths to diagnose routing
echo -e "\n7️⃣ Diagnosing routing issues..."
echo "Testing various paths:"
for path in "/" "/health" "/api" "/api/health" "/channel" "/api/channel"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" $RAILWAY_URL$path)
    echo "  $path -> HTTP $status"
done

echo -e "\n✅ Test complete. Check the output above for issues."