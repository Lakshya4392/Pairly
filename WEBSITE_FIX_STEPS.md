# 🌐 Website Fix - Step by Step

## 🔍 Current Issue
Backend working hai (✅ tested) but website mein "Failed to save waitlist" error aa raha hai.

## 📋 Website Code Issues & Solutions

### 1. **Check Current Website Code**
Pehle dekho website mein kya code hai:

```javascript
// Current code might be:
fetch('wrong-url/api/waitlist') // ❌ Wrong URL
// OR
fetch('localhost:3000/waitlist') // ❌ Local URL
// OR
missing headers // ❌ No Content-Type
```

### 2. **Replace with Correct Code**

**HTML Form** (make sure IDs match):
```html
<form id="waitlistForm">
  <input type="email" id="emailInput" placeholder="Enter your email" required>
  <button type="submit" id="submitBtn">Join Waitlist</button>
  <div id="message"></div>
</form>
```

**JavaScript** (replace ALL waitlist code with this):
```javascript
// ✅ CORRECT API URL
const API_URL = 'https://pairly-60qj.onrender.com';

// ✅ CORRECT Form Handler
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('waitlistForm');
  const emailInput = document.getElementById('emailInput');
  const submitBtn = document.getElementById('submitBtn');
  const messageDiv = document.getElementById('message');

  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      console.log('Submitting email:', email); // Debug log
      
      if (!email) {
        showMessage('Please enter your email', 'error');
        return;
      }

      // Show loading
      submitBtn.disabled = true;
      submitBtn.textContent = 'Joining...';
      showMessage('Adding to waitlist...', 'loading');

      try {
        console.log('Calling API:', `${API_URL}/invites/waitlist`); // Debug log
        
        const response = await fetch(`${API_URL}/invites/waitlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            source: 'website',
            name: '' // Optional
          })
        });

        console.log('Response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('Response data:', data); // Debug log

        if (data.success) {
          showMessage('🎉 Successfully added to waitlist! Check your email.', 'success');
          emailInput.value = '';
          
          // Store referral code
          if (data.inviteCode) {
            localStorage.setItem('pairlyReferralCode', data.inviteCode);
            console.log('Referral code saved:', data.inviteCode);
          }
        } else {
          if (data.alreadyExists) {
            showMessage('You are already on the waitlist! 🎉', 'success');
          } else {
            showMessage(data.message || 'Failed to join waitlist', 'error');
          }
        }

      } catch (error) {
        console.error('Network error:', error); // Debug log
        showMessage('Network error. Please check your connection.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join Waitlist';
      }
    });
  }

  function showMessage(text, type) {
    if (messageDiv) {
      messageDiv.textContent = text;
      messageDiv.className = `message ${type}`;
      
      if (type === 'success') {
        setTimeout(() => {
          messageDiv.textContent = '';
          messageDiv.className = 'message';
        }, 5000);
      }
    }
  }
});
```

### 3. **CSS for Messages** (add this):
```css
.message {
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.message.loading {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
```

---

## 🔧 **Common Website Issues & Fixes**

### Issue 1: Wrong API URL
```javascript
// ❌ Wrong
fetch('http://localhost:3000/waitlist')
fetch('/api/waitlist')
fetch('https://wrong-domain.com/waitlist')

// ✅ Correct
fetch('https://pairly-60qj.onrender.com/invites/waitlist')
```

### Issue 2: Missing Headers
```javascript
// ❌ Wrong
fetch(url, {
  method: 'POST',
  body: JSON.stringify(data) // Missing headers
})

// ✅ Correct
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
```

### Issue 3: Wrong Request Body
```javascript
// ❌ Wrong
body: JSON.stringify({ emailAddress: email })
body: JSON.stringify({ userEmail: email })

// ✅ Correct
body: JSON.stringify({
  email: email,
  source: 'website'
})
```

### Issue 4: Form IDs Don't Match
```html
<!-- ❌ Wrong -->
<form id="newsletter-form">
<input id="user-email">

<!-- ✅ Correct -->
<form id="waitlistForm">
<input id="emailInput">
```

---

## 🧪 **Testing Steps**

### Step 1: Open Browser Console
1. Right-click on website → Inspect → Console
2. Submit form
3. Check for errors

### Step 2: Manual Test in Console
```javascript
// Test API directly in browser console
fetch('https://pairly-60qj.onrender.com/invites/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    source: 'website'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully added to waitlist!",
  "inviteCode": "some-code-here"
}
```

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Submit form
3. Look for request to `pairly-60qj.onrender.com`
4. Check if request is being made

---

## 🚨 **Quick Debug Checklist**

1. **✅ API URL**: `https://pairly-60qj.onrender.com/invites/waitlist`
2. **✅ Method**: `POST`
3. **✅ Headers**: `Content-Type: application/json`
4. **✅ Body**: `{ email, source: 'website' }`
5. **✅ Form IDs**: `waitlistForm`, `emailInput`
6. **✅ Event Listener**: `DOMContentLoaded` or after form exists

---

## 📱 **If Using React/Next.js**

```jsx
import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('https://pairly-60qj.onrender.com/invites/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          source: 'website'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('🎉 Successfully added to waitlist!');
        setEmail('');
      } else {
        setMessage(data.message || 'Failed to join waitlist');
      }
      
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Joining...' : 'Join Waitlist'}
      </button>
      {message && <div>{message}</div>}
    </form>
  );
}
```

---

## 🎯 **Action Plan**

1. **Replace** current waitlist JavaScript with code above
2. **Check** form IDs match (`waitlistForm`, `emailInput`)
3. **Test** in browser console first
4. **Check** browser DevTools for errors
5. **Verify** API URL is exactly: `https://pairly-60qj.onrender.com/invites/waitlist`

---

**Backend is 100% working** ✅  
**Now fix website code** 🔧  
**Then test complete flow** 🧪

Kya framework use kar rahe ho website mein? (HTML/JS, React, Next.js, Vue, etc.)?