# 🌐 Website Integration Code - Exact Implementation

## 📋 Problem
Website mein form hai but backend API call nahi kar raha. Emails database mein save nahi ho rahe.

## ✅ Solution
Website mein ye code add karo:

---

## 1. HTML Form (agar nahi hai toh add karo)

```html
<form id="waitlistForm" class="waitlist-form">
  <input 
    type="email" 
    id="emailInput" 
    placeholder="Enter your email" 
    required 
  />
  <button type="submit" id="submitBtn">
    Join Waitlist
  </button>
  <div id="message" class="message"></div>
</form>
```

---

## 2. JavaScript Code (Main Implementation)

```javascript
// API Configuration
const API_URL = 'https://pairly-60qj.onrender.com';

// Get form elements
const form = document.getElementById('waitlistForm');
const emailInput = document.getElementById('emailInput');
const submitBtn = document.getElementById('submitBtn');
const messageDiv = document.getElementById('message');

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  
  if (!email) {
    showMessage('Please enter your email', 'error');
    return;
  }
  
  // Validate email format
  if (!isValidEmail(email)) {
    showMessage('Please enter a valid email', 'error');
    return;
  }
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Joining...';
  showMessage('Adding you to waitlist...', 'loading');
  
  try {
    // Call backend API
    const response = await fetch(`${API_URL}/invites/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        name: '', // Optional
        source: 'website'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Success!
      showMessage('🎉 Successfully added to waitlist! Check your email.', 'success');
      emailInput.value = ''; // Clear form
      
      // Optional: Store referral code for later use
      if (data.inviteCode) {
        localStorage.setItem('pairlyReferralCode', data.inviteCode);
      }
      
    } else {
      // Handle specific errors
      if (data.alreadyExists) {
        showMessage('You are already on the waitlist! 🎉', 'success');
      } else {
        showMessage(data.message || 'Failed to join waitlist. Please try again.', 'error');
      }
    }
    
  } catch (error) {
    console.error('Waitlist error:', error);
    showMessage('Network error. Please check your connection and try again.', 'error');
  } finally {
    // Reset button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Join Waitlist';
  }
});

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  
  // Auto-hide after 5 seconds for non-error messages
  if (type !== 'error') {
    setTimeout(() => {
      messageDiv.textContent = '';
      messageDiv.className = 'message';
    }, 5000);
  }
}

// Optional: Handle referral codes from URL
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    // Store referral code for when user submits
    sessionStorage.setItem('referralCode', refCode);
    console.log('Referral code detected:', refCode);
  }
});
```

---

## 3. CSS Styling (Optional)

```css
.waitlist-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.waitlist-form input[type="email"] {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 10px;
}

.waitlist-form button {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.waitlist-form button:hover {
  background: #5a6fd8;
}

.waitlist-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

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

## 4. With Referral Support (Advanced)

Agar referral system chahiye:

```javascript
// Modified form submission with referral support
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const referralCode = sessionStorage.getItem('referralCode'); // From URL ?ref=CODE
  
  // ... validation code same as above ...
  
  try {
    const requestBody = {
      email: email,
      name: '', // Optional
      source: 'website'
    };
    
    // Add referral code if exists
    if (referralCode) {
      requestBody.referralCode = referralCode;
    }
    
    const response = await fetch(`${API_URL}/invites/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    // ... rest same as above ...
    
  } catch (error) {
    // ... error handling same as above ...
  }
});
```

---

## 5. React/Next.js Version (Agar React use kar rahe ho)

```jsx
import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage('Please enter your email');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    setMessage('Adding you to waitlist...');
    setMessageType('loading');
    
    try {
      const response = await fetch('https://pairly-60qj.onrender.com/invites/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          name: '',
          source: 'website'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('🎉 Successfully added to waitlist!');
        setMessageType('success');
        setEmail('');
      } else {
        setMessage(data.message || 'Failed to join waitlist');
        setMessageType('error');
      }
      
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="waitlist-form">
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
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}
    </form>
  );
}
```

---

## 🧪 Testing

### 1. Test API Endpoint Directly
```bash
curl -X POST https://pairly-60qj.onrender.com/invites/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"website"}'
```

### 2. Test in Browser Console
```javascript
fetch('https://pairly-60qj.onrender.com/invites/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    source: 'website'
  })
})
.then(r => r.json())
.then(console.log);
```

---

## 🔧 Troubleshooting

### CORS Error?
Backend mein CORS already enabled hai, but agar issue hai toh:
```javascript
// Add this to your website
const response = await fetch(`${API_URL}/invites/waitlist`, {
  method: 'POST',
  mode: 'cors', // Add this
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data)
});
```

### Network Error?
- Check if backend is running: `https://pairly-60qj.onrender.com/health`
- Check browser console for errors
- Verify API URL is correct

---

## 📋 Implementation Steps

1. **Copy JavaScript code** above into your website
2. **Update HTML form** with correct IDs
3. **Add CSS styling** (optional)
4. **Test with your email**
5. **Check database** for saved email

---

## ✅ Expected Flow

1. User enters email → Clicks submit
2. JavaScript calls `POST /invites/waitlist`
3. Backend saves to database
4. User sees success message
5. Email gets referral code for sharing

---

Ye code copy-paste kar do apni website mein. Agar koi specific framework (React, Vue, etc.) use kar rahe ho toh batao, main uske liye adjust kar dunga! 🚀