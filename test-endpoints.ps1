# Test Script for Pairly Premium System (PowerShell)
# Run this after deployment to verify everything works

$API_URL = "https://pairly-60qj.onrender.com"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TEST_EMAIL = "test$timestamp@example.com"
$TEST_CLERK_ID = "user_test_$timestamp"

Write-Host "🧪 Testing Pairly Premium System" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣ Testing Health Check..." -ForegroundColor Yellow
$healthResponse = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
$healthResponse | ConvertTo-Json
Write-Host ""

# Test 2: Waitlist Signup
Write-Host "2️⃣ Testing Waitlist Signup..." -ForegroundColor Yellow
$waitlistBody = @{
    email = $TEST_EMAIL
    name = "Test User"
} | ConvertTo-Json

$waitlistResponse = Invoke-RestMethod -Uri "$API_URL/invites/waitlist" -Method Post -Body $waitlistBody -ContentType "application/json"
$waitlistResponse | ConvertTo-Json
$INVITE_CODE = $waitlistResponse.inviteCode
Write-Host "Invite Code: $INVITE_CODE" -ForegroundColor Green
Write-Host ""

# Test 3: Email Verification (First Login)
Write-Host "3️⃣ Testing Email Verification (First Login)..." -ForegroundColor Yellow
$verifyBody = @{
    email = $TEST_EMAIL
    clerkId = $TEST_CLERK_ID
} | ConvertTo-Json

$verifyResponse = Invoke-RestMethod -Uri "$API_URL/auth/verify-email" -Method Post -Body $verifyBody -ContentType "application/json"
$verifyResponse | ConvertTo-Json
$IS_PREMIUM = $verifyResponse.isPremium
$DAYS_REMAINING = $verifyResponse.premiumDaysRemaining
Write-Host ""

# Test 4: Premium Status Check
Write-Host "4️⃣ Testing Premium Status..." -ForegroundColor Yellow
$premiumResponse = Invoke-RestMethod -Uri "$API_URL/invites/premium-status?email=$TEST_EMAIL" -Method Get
$premiumResponse | ConvertTo-Json
Write-Host ""

# Test 5: Referral Count Check
Write-Host "5️⃣ Testing Referral Count..." -ForegroundColor Yellow
$countResponse = Invoke-RestMethod -Uri "$API_URL/invites/count?code=$INVITE_CODE" -Method Get
$countResponse | ConvertTo-Json
Write-Host ""

# Test 6: Referral Signup
Write-Host "6️⃣ Testing Referral Signup..." -ForegroundColor Yellow
$FRIEND_EMAIL = "friend$timestamp@example.com"
$friendBody = @{
    email = $FRIEND_EMAIL
    name = "Friend"
    referralCode = $INVITE_CODE
} | ConvertTo-Json

$friendResponse = Invoke-RestMethod -Uri "$API_URL/invites/waitlist" -Method Post -Body $friendBody -ContentType "application/json"
$friendResponse | ConvertTo-Json
Write-Host ""

# Test 7: Check Updated Referral Count
Write-Host "7️⃣ Testing Updated Referral Count..." -ForegroundColor Yellow
$updatedCountResponse = Invoke-RestMethod -Uri "$API_URL/invites/count?code=$INVITE_CODE" -Method Get
$updatedCountResponse | ConvertTo-Json
Write-Host ""

# Te