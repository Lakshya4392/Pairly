# 🔐 Pairly Whitelist System - Complete Guide

## Overview
Scarcity marketing ka full power! Sirf whitelisted emails hi login kar sakenge, chahe APK kisi ke paas bhi ho.

## 🎯 Features

### 1. **Access Control (APK Leak Protection)**
- Sirf whitelisted emails hi app use kar sakenge
- APK share karne se kuch nahi hoga
- Login time pe automatic check hoga

### 2. **Referral Rewards**
- User apne dost ko invite bhej sakta hai
- Jab dost join karega, inviter ko **1 month Premium FREE** milega
- Unlimited invites bhej sakte hain

### 3. **Invite Tracking**
- Kitne logo ko invite bheja
- Kitne log join kar gaye
- Kitne rewards mile

## 🚀 Setup Instructions

### Step 1: Database Migration
```bash
cd backend
npx prisma migrate dev --name add_whitelist_system
npx prisma generate
```

### Step 2: Add Users to Whitelist

#### Option A: Using Script (Recommended)
```bash
cd backend
npm run add-whitelist
# Ya double-click: add-to-whitelist.bat
```

#### Option B: Direct Database
```sql
INSERT INTO "InvitedUser" (id, email, status, "inviteCode", "invitedAt")
VALUES (
  gen_random_uuid(),
  'user@example.com',
  'pending',
  gen_random_uuid(),
  NOW()
);
```

#### Option C: Using API (After Deploy)
```bash
curl -X POST https://your-backend.onrender.com/invites/invite-friend \
  -H "Content-Type: application/json" \
  -d '{
    "senderClerkId": "your_clerk_id",
    "friendEmail": "friend@example.com"
  }'
```

### Step 3: Deploy Backend
```bash
cd backend
git add .
git commit -m "Add whitelist system"
git push
```

Backend automatically deploy ho jayega Render pe.

## 📱 Frontend Integration

### Auth Flow Update

Update `App.tsx` ya auth flow:

```typescript
import AccessCheckScreen from './src/screens/AccessCheckScreen';

// After Clerk sign-in, before main app:
const [accessGranted, setAccessGranted] = useState(false);

if (user && !accessGranted) {
  return (
    <AccessCheckScreen
      email={user.primaryEmailAddress?.emailAddress || ''}
      onAccessGranted={(inviteCode) => {
        setAccessGranted(true);
        // Mark as joined in backend
        markAsJoined(user.primaryEmailAddress?.emailAddress);
      }}
    />
  );
}
```

### Add Invite Screen to Navigation

```typescript
// In your navigation:
<Stack.Screen 
  name="InviteFriend" 
  component={InviteFriendScreen}
  options={{ title: 'Invite Friends' }}
/>
```

## 🔄 Complete Flow

### New User Flow:
1. User downloads APK
2. Opens app → Clerk sign-in screen
3. Signs in with Google/Email
4. **Access Check Screen** appears
5. Backend checks: `POST /invites/check-access`
   - ✅ If whitelisted → Welcome screen → Main app
   - ❌ If not whitelisted → "Invite-only" message → Waitlist link

### Invite Flow:
1. Existing user opens "Invite Friends" screen
2. Enters friend's email
3. Backend: `POST /invites/invite-friend`
4. Friend gets email/link (you need to setup email service)
5. Friend downloads APK → Signs in
6. Backend: `POST /invites/mark-joined`
7. **Inviter gets 1 month Premium automatically! 🎁**

## 🎁 Reward System

### How Rewards Work:
```typescript
// When friend joins:
1. Find invite by email
2. Update status: 'pending' → 'joined'
3. Find inviter (invitedBy field)
4. Grant Premium:
   - If already premium: Add 30 days to expiry
   - If not premium: Set expiry = now + 30 days
5. Mark reward as granted
6. Send notification to inviter
```

### Reward Types:
- `premium_month` - 1 month free (default)
- `premium_3months` - 3 months (for special campaigns)
- Custom rewards (you can add more)

## 🛡️ Security Features

### APK Leak Protection:
```typescript
// Even if someone shares APK:
1. They install app ✅
2. They sign in with Google ✅
3. Access check fails ❌
4. "Invite-only" screen shows ❌
5. Cannot access main app ❌
```

### Invite Validation:
- Email must be unique
- Cannot invite same person twice
- Cannot invite already joined users
- Optional: Invite expiry (30 days)

## 📊 Admin Tools

### Check Whitelist Stats:
```bash
cd backend
npx prisma studio
# Open InvitedUser table
```

### Bulk Add Users:
```typescript
// Create: backend/src/scripts/bulkAddWhitelist.ts
const emails = [
  'user1@example.com',
  'user2@example.com',
  'user3@example.com',
];

for (const email of emails) {
  await prisma.invitedUser.create({
    data: { email: email.toLowerCase(), status: 'pending' },
  });
}
```

## 🔧 API Endpoints

### 1. Check Access
```
POST /invites/check-access
Body: { email: "user@example.com" }
Response: { allowed: true/false, message: "..." }
```

### 2. Send Invite
```
POST /invites/invite-friend
Body: {
  senderClerkId: "user_xxx",
  friendEmail: "friend@example.com"
}
Response: {
  success: true,
  inviteCode: "xxx",
  inviteLink: "https://pairly.app/join/xxx"
}
```

### 3. Mark as Joined
```
POST /invites/mark-joined
Body: { email: "user@example.com" }
Response: { success: true }
```

### 4. Get Invite Stats
```
GET /invites/my-invites/:clerkId
Response: {
  totalInvited: 5,
  joined: 2,
  pending: 3,
  rewardsEarned: 2,
  invites: [...]
}
```

## 📧 Email Setup (Optional but Recommended)

### Using Resend (Recommended):
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Pairly <noreply@pairly.app>',
  to: friendEmail,
  subject: 'You\'re invited to Pairly! 💕',
  html: `
    <h1>Your friend invited you to Pairly!</h1>
    <p>Download the app and join: ${inviteLink}</p>
  `,
});
```

### Using SendGrid:
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: friendEmail,
  from: 'noreply@pairly.app',
  subject: 'You\'re invited to Pairly! 💕',
  html: `...`,
});
```

## 🎨 Customization

### Change Reward Amount:
```typescript
// In inviteRoutes.ts, mark-joined endpoint:
const newExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
```

### Add Invite Expiry:
```typescript
// In inviteRoutes.ts, invite-friend endpoint:
expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
```

### Custom Waitlist URL:
```typescript
// In AccessCheckScreen.tsx:
waitlistUrl: 'https://your-waitlist-url.com',
```

## 🚨 Testing

### Test Access Check:
```bash
curl -X POST http://localhost:3000/invites/check-access \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Test Invite:
```bash
curl -X POST http://localhost:3000/invites/invite-friend \
  -H "Content-Type: application/json" \
  -d '{
    "senderClerkId":"user_xxx",
    "friendEmail":"friend@example.com"
  }'
```

## 📈 Growth Strategy

### Phase 1: Seed Users (Week 1)
- Manually add 50-100 beta testers
- Give them unlimited invites
- Track who invites most people

### Phase 2: Viral Loop (Week 2-4)
- Top inviters get bonus rewards
- Leaderboard of top inviters
- Social proof: "1000+ people waiting"

### Phase 3: Controlled Opening (Month 2)
- Gradually increase whitelist
- Keep scarcity feeling
- "Limited spots available"

## 🎯 Marketing Messages

### For Existing Users:
"Invite your friends and get Premium free! Each friend = 1 month Premium 🎁"

### For New Users (Not Whitelisted):
"Pairly is invite-only. Know someone using it? Ask for an invite!"

### For Invited Users:
"Your friend invited you to Pairly! Download now and join the exclusive community 💕"

## 🔥 Pro Tips

1. **Scarcity Works**: Don't open too fast
2. **Reward Generously**: 1 month Premium is worth it for viral growth
3. **Track Everything**: Who invites most? What's conversion rate?
4. **Social Proof**: Show "X people joined today"
5. **FOMO**: "Limited beta access"

## 📝 Next Steps

1. ✅ Run database migration
2. ✅ Add yourself to whitelist
3. ✅ Test access check flow
4. ✅ Deploy backend
5. ✅ Update frontend auth flow
6. ⏳ Setup email service (optional)
7. ⏳ Add invite screen to navigation
8. ⏳ Test complete flow
9. ⏳ Add first 50 beta users
10. ⏳ Launch! 🚀

## 🆘 Troubleshooting

### "Access denied" for whitelisted email:
- Check email spelling (case-insensitive)
- Check database: `SELECT * FROM "InvitedUser" WHERE email = 'xxx'`
- Check status field (should be 'pending' or 'joined')

### Reward not granted:
- Check `invitedBy` field is set
- Check `rewardGranted` is false
- Check inviter exists in User table
- Check logs for errors

### Invite not working:
- Check API endpoint is accessible
- Check Clerk user ID is correct
- Check email is valid format
- Check for duplicate invites

---

Bhai, ab tera system **bulletproof** hai! APK leak ho ya na ho, sirf whitelisted log hi andar aa sakte hain. Aur referral system se viral growth bhi hoga! 🚀
