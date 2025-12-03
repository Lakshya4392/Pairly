# 🌐 Website Waitlist → Backend Setup (Complete)

## ✅ What's Ready

### Backend Endpoint Created:
```
POST https://your-backend.onrender.com/invites/waitlist
```

### Features:
- ✅ Automatically stores emails in database
- ✅ Prevents duplicate entries
- ✅ Email validation
- ✅ Returns success/error messages
- ✅ Tracks signup source (website, app, etc.)
- ✅ Admin stats endpoint

## 🚀 Quick Setup (3 Steps)

### Step 1: Deploy Backend (2 min)
```bash
cd backend
git add .
git commit -m "Add waitlist endpoint for website"
git push
```

Wait for Render to deploy (2-3 minutes).

### Step 2: Get Your Backend URL
Your backend URL should be something like:
```
https://pairly-backend-xxxx.onrender.com
```

### Step 3: Update Vercel Website
In your Vercel website code, update the waitlist form:

```javascript
// Replace this URL with your actual backend URL
const API_URL = 'https://your-backend.onrender.com';

async function handleWaitlistSubmit(email) {
  const response = await fetch(`${API_URL}/invites/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: email.toLowerCase(),
      source: 'website' 
    }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('✅ Successfully added to waitlist!');
  } else {
    alert('❌ ' + data.error);
  }
}
```

## 🧪 Testing

### Test 1: Local Backend
```bash
# Start backend
cd backend
npm run dev

# In another terminal, test:
node test-waitlist.js
```

### Test 2: Production Backend
```bash
# Set your production URL
export API_URL=https://your-backend.onrender.com

# Test
node test-waitlist.js
```

### Test 3: From Website
1. Go to: `https://pairly-iota.vercel.app`
2. Enter email in waitlist form
3. Submit
4. Check backend database:
```bash
cd backend
npx prisma studio
# Open InvitedUser table
```

## 📊 View Waitlist Data

### Option 1: Prisma Studio (Visual)
```bash
cd backend
npx prisma studio
# Open InvitedUser table
```

### Option 2: API Stats
```bash
curl https://your-backend.onrender.com/invites/waitlist/stats
```

Response:
```json
{
  "total": 150,
  "pending": 120,
  "joined": 30,
  "recentSignups": 25,
  "conversionRate": "20.00"
}
```

### Option 3: Direct Database Query
```sql
SELECT * FROM "InvitedUser" 
WHERE status = 'pending' 
ORDER BY "invitedAt" DESC;
```

## 🔄 Complete Flow

```
User visits website
    ↓
Enters email in form
    ↓
Website sends POST to /invites/waitlist
    ↓
Backend validates email
    ↓
Backend checks for duplicates
    ↓
Backend saves to database
    ↓
Backend returns success message
    ↓
Website shows confirmation
    ↓
User is in waitlist! ✅
```

## 📝 API Documentation

### Add to Waitlist
```
POST /invites/waitlist

Request:
{
  "email": "user@example.com",
  "name": "User Name" (optional),
  "source": "website" (optional)
}

Success Response:
{
  "success": true,
  "message": "Successfully added to waitlist!",
  "inviteCode": "clxxx..."
}

Already Exists Response:
{
  "success": true,
  "message": "You are already on the waitlist!",
  "alreadyExists": true
}

Error Response:
{
  "success": false,
  "error": "Invalid email format"
}
```

### Get Stats (Admin)
```
GET /invites/waitlist/stats

Response:
{
  "total": 150,
  "pending": 120,
  "joined": 30,
  "recentSignups": 25,
  "conversionRate": "20.00"
}
```

## 🎨 Frontend Examples

### Vanilla JavaScript
```html
<form id="waitlist-form">
  <input type="email" id="email" placeholder="Enter your email" required>
  <button type="submit">Join Waitlist</button>
</form>

<script>
document.getElementById('waitlist-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  
  const response = await fetch('https://your-backend.onrender.com/invites/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'website' }),
  });
  
  const data = await response.json();
  alert(data.message);
});
</script>
```

### React
```jsx
const [email, setEmail] = useState('');

const handleSubmit = async (e) => {
  e.preventDefault();
  
  const response = await fetch('https://your-backend.onrender.com/invites/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'website' }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('✅ ' + data.message);
    setEmail('');
  }
};
```

### Next.js (API Route)
```typescript
// pages/api/waitlist.ts
export default async function handler(req, res) {
  const response = await fetch('https://your-backend.onrender.com/invites/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
  
  const data = await response.json();
  res.json(data);
}
```

## 🔐 Security

### Already Implemented:
- ✅ Email validation (regex)
- ✅ Duplicate prevention
- ✅ Case-insensitive email matching
- ✅ CORS enabled
- ✅ Error handling

### Optional Enhancements:
```typescript
// Rate limiting (prevent spam)
import rateLimit from 'express-rate-limit';

const waitlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per IP
  message: 'Too many requests, please try again later',
});

router.post('/waitlist', waitlistLimiter, async (req, res) => {
  // ... existing code
});
```

## 📧 Email Notifications (Optional)

Send confirmation email after signup:

```typescript
// Install: npm install resend

import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// In /waitlist endpoint, after creating invite:
await resend.emails.send({
  from: 'Pairly <noreply@pairly.app>',
  to: email,
  subject: 'Welcome to Pairly Waitlist! 💕',
  html: `
    <h1>You're on the list!</h1>
    <p>Thanks for joining the Pairly waitlist.</p>
    <p>We'll notify you when we launch! 🚀</p>
  `,
});
```

## 📈 Analytics Integration

Track waitlist signups:

```javascript
// Google Analytics
if (window.gtag) {
  window.gtag('event', 'waitlist_signup', {
    email: email,
    source: 'website',
  });
}

// Facebook Pixel
if (window.fbq) {
  window.fbq('track', 'Lead', {
    content_name: 'Waitlist Signup',
  });
}
```

## 🎯 Next Steps

1. ✅ Deploy backend
2. ✅ Get backend URL from Render
3. ✅ Update Vercel website code
4. ✅ Test complete flow
5. ⏳ Setup email notifications (optional)
6. ⏳ Add analytics tracking
7. ⏳ Create admin dashboard

## 🆘 Troubleshooting

### CORS Error?
```typescript
// In backend/src/index.ts:
app.use(cors({
  origin: 'https://pairly-iota.vercel.app',
  credentials: true,
}));
```

### Email not saving?
- Check backend logs on Render
- Check database connection
- Run: `npx prisma studio` to view data

### Duplicate error?
- Email already exists in database
- This is expected behavior (prevents spam)

## 📊 Monitor Waitlist Growth

### Daily Stats:
```bash
# Get today's signups
curl https://your-backend.onrender.com/invites/waitlist/stats
```

### Export Waitlist:
```bash
# Using Prisma
cd backend
npx prisma studio
# Export InvitedUser table to CSV
```

---

## 🎉 Summary

Bhai, ab tera complete system ready hai:

✅ **Website** → Waitlist form  
✅ **Backend** → `/invites/waitlist` endpoint  
✅ **Database** → Automatic storage  
✅ **Admin** → Stats & management  

Bas deploy kar aur test kar! 🚀

**Total Setup Time:** 5-10 minutes  
**Zero Configuration Needed:** Just deploy!

Good luck! 💪
