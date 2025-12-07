# 📊 Database Schema - Email Storage Details

## 🗄️ **Table Name**: `InvitedUser`

Website se emails is table mein save ho rahe hain:

```sql
CREATE TABLE "InvitedUser" (
  id            TEXT PRIMARY KEY,           -- Unique ID (auto-generated)
  email         TEXT UNIQUE NOT NULL,       -- User's email (unique)
  phoneNumber   TEXT UNIQUE,                -- Optional phone
  invitedBy     TEXT,                       -- Who invited this user
  status        TEXT DEFAULT 'pending',     -- 'pending' | 'joined' | 'expired'
  inviteCode    TEXT UNIQUE NOT NULL,       -- Referral code (auto-generated)
  invitedAt     TIMESTAMP DEFAULT NOW(),    -- When user joined waitlist
  joinedAt      TIMESTAMP,                  -- When user joined app
  expiresAt     TIMESTAMP,                  -- Optional expiry
  
  -- Metadata
  source        TEXT,                       -- 'website', 'app', 'referral'
  name          TEXT,                       -- Optional user name
  
  -- Reward System
  rewardGranted BOOLEAN DEFAULT false,      -- Has user got reward?
  rewardType    TEXT,                       -- Type of reward
  
  -- App Integration
  clerkId       TEXT UNIQUE,                -- Clerk authentication ID
  referralCount INTEGER DEFAULT 0,          -- How many people they referred
  isPremium     BOOLEAN DEFAULT false       -- Premium status
);
```

---

## 📝 **When Website Form Submits**

### Input Data:
```javascript
{
  email: "user@example.com",
  name: "User Name",        // Optional
  source: "website"
}
```

### Database Record Created:
```json
{
  "id": "cmir8q1qw00029a2ccjsvqy44",           // Auto-generated
  "email": "user@example.com",                 // From form
  "phoneNumber": null,                         // Not provided
  "invitedBy": null,                          // No referrer
  "status": "pending",                        // Default
  "inviteCode": "cmir8q1qw00039a2ck3ri395y",  // Auto-generated
  "invitedAt": "2025-12-04T09:35:04.123Z",    // Current timestamp
  "joinedAt": null,                           // Not joined app yet
  "expiresAt": null,                          // No expiry
  
  "source": "website",                        // From form
  "name": "User Name",                        // From form (optional)
  
  "rewardGranted": false,                     // Default
  "rewardType": null,                         // No reward yet
  
  "clerkId": null,                           // Not linked to app yet
  "referralCount": 0,                        // Default
  "isPremium": false                         // Default
}
```

---

## 🔄 **Complet