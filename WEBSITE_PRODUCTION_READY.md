# 🌐 Website → Production API Integration

## ✅ **Production API Ready**
- **URL**: `https://pairly-60qj.onrender.com/invites/waitlist`
- **Status**: Working ✅
- **Database**: Connected ✅
- **Tested**: Complete flow working ✅

---

## 🔧 **Website Implementation**

### **Step 1: Replace ALL Waitlist Code**

**Remove** current local API calls and **replace** with this:

```javascript
// ✅ PRODUCTION API CONFIGURATION
const PAIRLY_API = 'https://pairly-60qj.onrender.com';

// ✅ WAITLIST FORM HANDLER
document.addEventListener('DOMContentLoaded', function() {
  const waitlistForm = document.getElementById('waitlistForm');
  const emailInput = document.getElementById('emailInput');
  const submitButton = document.getElementById('submitBtn');
  const messageDiv = document.getElementById('message');

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      
      // Validation
      if (!email) {
        showMessage('Please enter your email address', 'error');
        return;
      }
      
      if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
      }

      // Show loading state
      setLoadingState(true);
      showMessage('Adding you to the waitlist...', 'loading');

      try {
        // Call Production API
        const response = await fetch(`${PAIRLY_API}/invites/waitlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            source: 'website',
            name: '' // Optional - can add name field later
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Success!
          showMessage('🎉 Successfully added to waitlist! You\'ll receive an email soon.', 'success');
          emailInput.value = ''; // Clear form
          
          // Store referral code for sharing
          if (data.inviteCode) {
            localStorage.setItem('pairlyReferralCode', data.inviteCode);
            console.log('Referral code saved:', data.inviteCode);
          }
          
        } else {
          // Handle errors
          if (data.alreadyExists) {
            showMessage('Great! You\'re already on our waitlist! 🎉', 'success');
          } else {
            showMessage(data.message || 'Something went wrong. Please try again.', 'error');
          }
        }

      } catch (error) {
        console.error('Waitlist submission error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
      } finally {
        setLoadingState(false);
      }
    });
  }

  // Helper Functions
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function setLoadingState(loading) {
    if (submitButton) {
      submitButton.disabled = loading;
      submitButton.textContent = loading ? 'Joining...' : 'Join Waitlist';
    }
  }

  function showMessage(text, type) {
    if (messageDiv) {
      messageDiv.textContent = text;
      messageDiv.className = `message ${type}`;
      
      // Auto-hide success messages after 5 seconds
      if (type === 'success') {
        setTimeout(() => {
          messageDiv.textContent = '';
          messageDiv.className = 'message';
        }, 5000);
      }
    }
  }

  // Handle referral codes from URL (?ref=CODE)
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');
  if (referralCode) {
    sessionStorage.setItem('referralCode', referralCode);
    console.log('Referral code detected:', referralCode);
  }
});
```

---

### **Step 2: Update HTML Structure**

Make sure your HTML has these exact IDs:

```html
<form id="waitlistForm" class="waitlist-form">
  <div class="form-group">
    <input 
      type="email" 
      id="emailInput" 
      placeholder="Enter your email address" 
      required 
      class="email-input"
    />
  </div>
  
  <button type="submit" id="submitBtn" class="submit-button">
    Join Waitlist
  </button>
  
  <div id="message" class="message"></div>
</form>
```

---

### **Step 3: Add CSS Styling**

```css
.waitlist-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.email-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.email-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.submit-button {
  width: 100%;
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.submit-button:disabled {
  background: #a0a0a0;
  cursor: not-allowed;
  transform: none;
}

.message {
  margin-top: 15px;
  padding: 12px 16px;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
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

### **Step 4: Advanced Features (Optional)**

#### **With Referral Support:**
```javascript
// In the fetch call, add referral code if exists
const requestBody = {
  email: email,
  source: 'website'
};

// Add referral code if user came from referral link
const storedReferralCode = sessionStorage.getItem('referralCode');
if (storedReferralCode) {
  requestBody.referralCode = storedReferralCode;
}

const response = await fetch(`${PAIRLY_API}/invites/waitlist`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody)
});
```

#### **With Name Field:**
```html
<input 
  type="text" 
  id="nameInput" 
  placeholder="Your name (optional)" 
  class="name-input"
/>
```

```javascript
// In JavaScript
const name = document.getElementById('nameInput')?.value.trim() || '';

// In request body
body: JSON.stringify({
  email: email,
  name: name,
  source: 'website'
})
```

---

## 🧪 **Testing Steps**

### **1. Browser Console Test**
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

// Expected response:
// { success: true, message: "Successfully added to waitlist!", inviteCode: "..." }
```

### **2. Form Testing**
1. Open website
2. Enter email: `test@example.com`
3. Click "Join Waitlist"
4. Should see: "🎉 Successfully added to waitlist!"

### **3. Error Testing**
1. Submit same email again
2. Should see: "Great! You're already on our waitlist! 🎉"

---

## 🚨 **Common Issues & Fixes**

### **Issue 1: CORS Error**
```javascript
// Add this if CORS issues
const response = await fetch(`${PAIRLY_API}/invites/waitlist`, {
  method: 'POST',
  mode: 'cors', // Add this
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### **Issue 2: Form Not Submitting**
- Check form ID: `waitlistForm`
- Check input ID: `emailInput`
- Check button ID: `submitBtn`
- Check message div ID: `message`

### **Issue 3: Network Error**
- Check API URL: `https://pairly-60qj.onrender.com/invites/waitlist`
- Check internet connection
- Check browser console for errors

---

## 📱 **Mobile Optimization**

```css
@media (max-width: 768px) {
  .waitlist-form {
    padding: 15px;
    margin: 0 15px;
  }
  
  .email-input, .submit-button {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
```

---

## 🎯 **Implementation Checklist**

- [ ] Replace old API calls with production URL
- [ ] Update HTML form IDs
- [ ] Add JavaScript event handler
- [ ] Add CSS styling
- [ ] Test with real email
- [ ] Test error scenarios
- [ ] Test on mobile devices

---

## 🚀 **Go Live!**

1. **Copy JavaScript code** above
2. **Replace current waitlist code**
3. **Update HTML IDs** if needed
4. **Test with your email**
5. **Deploy to production**

**Production API is ready and tested** ✅  
**Just implement this code in website** 🔧  
**Complete flow will work perfectly** 🎉

Koi specific framework use kar rahe ho? (React, Vue, plain HTML?) 🤔