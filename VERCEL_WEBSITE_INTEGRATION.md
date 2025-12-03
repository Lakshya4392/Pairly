# 🌐 Vercel Website → Backend Integration

## Overview
Tera Vercel website (`https://pairly-iota.vercel.app`) se waitlist emails automatically backend database mein store hongi.

## 🔗 API Endpoint

### Add to Waitlist
```
POST https://your-backend.onrender.com/invites/waitlist

Body:
{
  "email": "user@example.com",
  "name": "User Name" (optional),
  "source": "website" (optional)
}

Response (Success):
{
  "success": true,
  "message": "Successfully added to waitlist!",
  "inviteCode": "clxxx..."
}

Response (Already Exists):
{
  "success": true,
  "message": "You are already on the waitlist!",
  "alreadyExists": true
}

Response (Error):
{
  "success": false,
  "error": "Invalid email format"
}
```

## 📝 Vercel Website Code

### Option 1: Using Fetch (Vanilla JS)

```javascript
// In your Vercel website's waitlist form handler:

async function handleWaitlistSubmit(email) {
  try {
    const response = await fetch('https://your-backend.onrender.com/invites/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        source: 'website',
      }),
    });

    const data = await response.json();

    if (data.success) {
      if (data.alreadyExists) {
        alert('You are already on the waitlist! 🎉');
      } else {
        alert('Successfully added to waitlist! Check your email 📧');
      }
    } else {
      alert('Error: ' + data.error);
    }

  } catch (error) {
    console.error('Waitlist error:', error);
    alert('Failed to join waitlist. Please try again.');
  }
}

// Example form handler:
document.getElementById('waitlist-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email-input').value;
  await handleWaitlistSubmit(email);
});
```

### Option 2: Using Axios (React/Next.js)

```javascript
import axios from 'axios';

const API_URL = 'https://your-backend.onrender.com';

export async function joinWaitlist(email: string) {
  try {
    const response = await axios.post(`${API_URL}/invites/waitlist`, {
      email: email.toLowerCase(),
      source: 'website',
    });

    return {
      success: true,
      message: response.data.message,
      alreadyExists: response.data.alreadyExists,
    };

  } catch (error) {
    console.error('Waitlist error:', error);
    return {
      success: false,
      message: 'Failed to join waitlist',
    };
  }
}

// Usage in component:
const handleSubmit = async (e) => {
  e.preventDefault();
  const result = await joinWaitlist(email);
  
  if (result.success) {
    setMessage(result.message);
    setEmail(''); // Clear input
  } else {
    setError(result.message);
  }
};
```

### Option 3: Using API Route (Next.js)

```javascript
// pages/api/waitlist.ts (in your Vercel project)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  try {
    const response = await fetch('https://your-backend.onrender.com/invites/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        source: 'website',
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Waitlist error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to join waitlist' 
    });
  }
}

// Then in your frontend:
const response = await fetch('/api/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});
```

## 🎨 Complete Example (React Component)

```jsx
import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('https://your-backend.onrender.com/invites/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          source: 'website',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setEmail(''); // Clear input
        
        // Optional: Track with analytics
        if (window.gtag) {
          window.gtag('event', 'waitlist_signup', {
            email: email,
          });
        }
      } else {
        setError(data.error || 'Failed to join waitlist');
      }

    } catch (error) {
      console.error('Waitlist error:', error);
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="waitlist-form">
      <h2>Join the Waitlist</h2>
      <p>Get early access to Pairly 💕</p>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Joining...' : 'Join Waitlist'}
        </button>
      </form>

      {message && (
        <div className="success-message">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
    </div>
  );
}
```

## 🔧 Testing

### Test Locally (Backend running on localhost:3000):
```bash
curl -X POST http://localhost:3000/invites/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"website"}'
```

### Test Production:
```bash
curl -X POST https://your-backend.onrender.com/invites/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"website"}'
```

### Check if it worked:
```bash
# View in Prisma Studio:
cd backend
npx prisma studio
# Open InvitedUser table

# Or check via API:
curl http://localhost:3000/invites/waitlist/stats
```

## 📊 Admin Dashboard (Optional)

### Get Waitlist Stats:
```javascript
// In your admin panel:
const response = await fetch('https://your-backend.onrender.com/invites/waitlist/stats');
const stats = await response.json();

console.log(stats);
// {
//   total: 150,
//   pending: 120,
//   joined: 30,
//   recentSignups: 25,
//   conversionRate: "20.00"
// }
```

## 🚀 Deployment Steps

### Step 1: Deploy Backend
```bash
cd backend
git add .
git commit -m "Add waitlist endpoint"
git push
```

### Step 2: Update Vercel Website
Update your waitlist form to use the new endpoint:
```
https://your-backend.onrender.com/invites/waitlist
```

### Step 3: Test
1. Go to your website: `https://pairly-iota.vercel.app`
2. Enter email in waitlist form
3. Submit
4. Check backend database: `npx prisma studio`
5. Verify email is in `InvitedUser` table

## 🔐 CORS Configuration

Backend already has CORS enabled (`app.use(cors())`), but if you face issues:

```typescript
// In backend/src/index.ts:
app.use(cors({
  origin: [
    'https://pairly-iota.vercel.app',
    'http://localhost:3000',
  ],
  credentials: true,
}));
```

## 📧 Email Notifications (Optional)

After someone joins waitlist, send them a confirmation email:

```typescript
// In inviteRoutes.ts, after creating invite:

// Using Resend:
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Pairly <noreply@pairly.app>',
  to: email,
  subject: 'Welcome to Pairly Waitlist! 💕',
  html: `
    <h1>You're on the list!</h1>
    <p>Thanks for joining the Pairly waitlist. We'll notify you when we launch!</p>
    <p>In the meantime, invite your friends to move up the list 🚀</p>
  `,
});
```

## 🎯 Next Steps

1. ✅ Deploy backend with waitlist endpoint
2. ✅ Update Vercel website to use new endpoint
3. ✅ Test complete flow
4. ⏳ Setup email notifications (optional)
5. ⏳ Add analytics tracking
6. ⏳ Create admin dashboard to view waitlist

## 📝 Environment Variables

Add to your Vercel website:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

Then use in code:
```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

---

Bhai, ab tera website directly backend se connected hai! Waitlist emails automatically database mein store hongi! 🚀
