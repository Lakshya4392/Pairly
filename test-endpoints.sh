#!/bin/bash

# Test Script for Pairly Premium System
# Run this after deployment to verify everything works

API_URL="https://pairly-60qj.onrender.com"
TEST_EMAIL="test$(date +%s)@example.com"
TEST_CLERK_ID="user_test_$(date +%s)"

echo "🧪 Testing Pairly Premium System"
echo "================================"
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
curl -s "$API_URL/health" | jq '.'
echo ""

# Test 2: Waitlist Signup
echo "2️⃣ Testing Waitlist Signup..."
WAITLIST_RESPONSE=$(curl -s -X POST "$API_URL/invites/waitlist" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"name\":\"Test User\"}")

echo "$WAITLIST_RESPONSE" | jq '.'
INVITE_CODE=$(echo "$WAITLIST_RESPONSE" | jq -r '.inviteCode')
echo "Invite Code: $INVITE_CODE"
echo ""

# Test 3: Email Verification (First Login)
echo "3️⃣ Testing Email Verification (First Login)..."
VERIFY_RESPONSE=$(curl -s -X POST "$API_URL/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"clerkId\":\"$TEST_CLERK_ID\"}")

echo "$VERIFY_RESPONSE" | jq '.'
IS_PREMIUM=$(echo "$VERIFY_RESPONSE" | jq -r '.isPremium')
DAYS_REMAINING=$(echo "$VERIFY_RESPONSE" | jq -r '.premiumDaysRemaining')
echo ""

# Test 4: Premium Status Check
echo "4️⃣ Testing Premium Status..."
curl -s "$API_URL/invites/premium-status?email=$TEST_EMAIL" | jq '.'
echo ""

# Test 5: Referral Count Check
echo "5️⃣ Testing Referral Count..."
curl -s "$API_URL/invites/count?code=$INVITE_CODE" | jq '.'
echo ""

# Test 6: Referral Signup
echo "6️⃣ Testing Referral Signup..."
FRIEND_EMAIL="friend$(date +%s)@example.com"
curl -s -X POST "$API_URL/invites/waitlist" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$FRIEND_EMAIL\",\"name\":\"Friend\",\"referralCode\":\"$INVITE_CODE\"}" | jq '.'
echo ""

# Test 7: Check Updated Referral Count
echo "7️⃣ Testing Updated Referral Count..."
curl -s "$API_URL/invites/count?code=$INVITE_CODE" | jq '.'
echo ""

# Test 8: Waitlist Stats
echo "8️⃣ Testing Waitlist Stats..."
curl -s "$API_URL/invites/waitlist/stats" | jq '.'
echo ""

# Summary
echo "================================"
echo "✅ Test Summary"
echo "================================"
echo "Test Email: $TEST_EMAIL"
echo "Clerk ID: $TEST_CLERK_ID"
echo "Invite Code: $INVITE_CODE"
echo "Premium Status: $IS_PREMIUM"
echo "Days Remaining: $DAYS_REMAINING"
echo ""
echo "Expected Results:"
echo "- isPremium: true"
echo "- premiumDaysRemaining: 30"
echo "- referralCount: 1 (after friend signup)"
echo ""

if [ "$IS_PREMIUM" = "true" ] && [ "$DAYS_REMAINING" = "30" ]; then
  echo "🎉 All tests PASSED!"
else
  echo "⚠️ Some tests may have failed. Check responses above."
fi
