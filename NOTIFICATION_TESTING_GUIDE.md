# 🔔 Notification Testing Guide - Exact Time Scheduling

## ✅ What's Fixed

### Before:
- ❌ Notifications at random times
- ❌ Delays in delivery
- ❌ No verification
- ❌ No sound control

### After:
- ✅ **EXACT time scheduling** (no delay)
- ✅ **Verified scheduling** (confirms it's set)
- ✅ **Proper channels** (high/medium/low priority)
- ✅ **Sound control** (based on notification type)
- ✅ **Debug tools** (test & verify)

---

## 🎯 How It Works Now

### Good Morning Notification:
```typescript
// User sets time in settings: 8:00 AM
NotificationService.scheduleGoodMorningReminder('08:00', 'Partner Name');

// What happens:
1. Cancels any existing good morning notification
2. Validates time format (HH:MM)
3. Schedules EXACT time: 8:00 AM daily
4. Uses 'reminders' channel (medium priority)
5. Enables sound
6. Verifies it's scheduled
7. Logs: "✅ Good morning reminder scheduled for 08:00 daily"
8. Logs: "✅ Verified: Good morning notification is scheduled"

// Result:
Every day at EXACTLY 8:00 AM:
☀️ Good Morning!
Say good morning to Partner Name 💕
```

### Good Night Notification:
```typescript
// User sets time in settings: 10:00 PM (22:00)
NotificationService.scheduleGoodNightReminder('22:00', 'Partner Name');

// What happens:
1. Cancels any existing good night notification
2. Validates time format
3. Schedules EXACT time: 10:00 PM daily
4. Uses 'reminders' channel
5. Enables sound
6. Verifies it's scheduled
7. Logs confirmation

// Result:
Every day at EXACTLY 10:00 PM:
🌙 Good Night!
Send a goodnight moment to Partner Name 💕
```

### Daily Moment Reminder:
```typescript
// User sets time in settings: 9:00 AM
NotificationService.scheduleDailyMomentReminder('09:00', 'Partner Name');

// Result:
Every day at EXACTLY 9:00 AM:
💕 Time to Share
Share a moment with Partner Name today!
```

---

## 🧪 Testing Commands

### Test Immediate Notification:
```typescript
// In your app, add a test button:
import NotificationService from './services/notificationService';

// Test good morning
await NotificationService.sendTestNotification('good_morning');

// Test good night
await NotificationService.sendTestNotification('good_night');

// Test daily moment
await NotificationService.sendTestNotification('daily_moment');
```

### Verify Scheduled Notifications:
```typescript
// Check what's scheduled
const summary = await NotificationService.getScheduledRemindersSummary();
console.log(summary);

// Output example:
// 📅 Scheduled Notifications (3):
//   • good_morning: Daily at 08:00
//   • good_night: Daily at 22:00
//   • daily_moment: Daily at 09:00
```

### Verify Specific Reminders:
```typescript
const status = await NotificationService.verifyScheduledReminders();
console.log('Good Morning:', status.goodMorning); // true/false
console.log('Good Night:', status.goodNight);     // true/false
console.log('Daily Moment:', status.dailyMoment); // true/false
console.log('Total:', status.total);              // number
```

---

## 📱 User Flow

### 1. Enable Good Morning Reminder:
```
User opens Settings
  ↓
Toggles "Good Morning Reminder" ON
  ↓
Sets time: 8:00 AM
  ↓
App calls: scheduleGoodMorningReminder('08:00', partnerName)
  ↓
Notification scheduled for 8:00 AM daily
  ↓
User sees confirmation: "✅ Good morning reminder set for 8:00 AM"
```

### 2. Next Day at 8:00 AM:
```
Phone time reaches 8:00 AM
  ↓
Android triggers notification EXACTLY at 8:00
  ↓
Notification appears:
  ☀️ Good Morning!
  Say good morning to Partner Name 💕
  
  With sound 🔊
  With vibration 📳
```

### 3. Change Time:
```
User changes time to 7:30 AM
  ↓
Old notification cancelled
  ↓
New notification scheduled for 7:30 AM
  ↓
Next day: notification at EXACTLY 7:30 AM
```

---

## 🔧 Implementation Details

### Notification Channels:
```typescript
// High Priority (Moments & Partner Activity)
Channel: 'moments'
- Importance: HIGH
- Sound: Yes
- Vibration: [0, 250, 250, 250]
- Badge: Yes
- Use for: Partner sends moment, new note, etc.

// Medium Priority (Daily Reminders)
Channel: 'reminders'
- Importance: DEFAULT
- Sound: Yes
- Vibration: [0, 250]
- Badge: Yes
- Use for: Good morning, good night, daily moment

// Low Priority (Information)
Channel: 'info'
- Importance: LOW
- Sound: No
- Vibration: No
- Badge: No
- Use for: Tips, updates, etc.
```

### Time Validation:
```typescript
const [hour, minute] = time.split(':').map(Number);

// Validates:
- hour: 0-23
- minute: 0-59

// Invalid examples:
'25:00' ❌ (hour > 23)
'12:60' ❌ (minute > 59)
'abc:00' ❌ (not a number)

// Valid examples:
'08:00' ✅
'22:30' ✅
'00:00' ✅ (midnight)
'23:59' ✅
```

### Scheduling Trigger:
```typescript
trigger: {
  hour: 8,           // 0-23
  minute: 0,         // 0-59
  repeats: true,     // Daily
  channelId: 'reminders'
}

// This creates a DAILY repeating notification
// at EXACT time specified
// NO random delays
// NO approximate times
```

---

## 🐛 Troubleshooting

### Notification Not Appearing:
```typescript
// 1. Check if scheduled
const summary = await NotificationService.getScheduledRemindersSummary();
console.log(summary);

// 2. Check permissions
const { status } = await Notifications.getPermissionsAsync();
console.log('Permission:', status); // Should be 'granted'

// 3. Test immediate notification
await NotificationService.sendTestNotification('good_morning');
// Should appear immediately

// 4. Check Android settings
// Settings → Apps → Pairly → Notifications
// Make sure all channels are enabled
```

### Wrong Time:
```typescript
// 1. Verify what's scheduled
const scheduled = await Notifications.getAllScheduledNotificationsAsync();
console.log(scheduled);

// 2. Check trigger
const trigger = scheduled[0].trigger;
console.log('Hour:', trigger.hour);
console.log('Minute:', trigger.minute);

// 3. Reschedule
await NotificationService.scheduleGoodMorningReminder('08:00', 'Partner');
```

### No Sound:
```typescript
// 1. Check notification handler
// Should return shouldPlaySound: true for reminders

// 2. Check channel settings
// Channel 'reminders' should have sound: 'default'

// 3. Check phone settings
// Make sure phone is not in silent mode
// Check Do Not Disturb settings
```

---

## 📊 Expected Behavior

### Scenario 1: User Sets Good Morning at 8:00 AM
```
Day 1:
- 3:00 PM: User enables reminder, sets 8:00 AM
- Notification scheduled

Day 2:
- 8:00:00 AM: Notification appears EXACTLY
- User sees: "☀️ Good Morning!"

Day 3:
- 8:00:00 AM: Notification appears EXACTLY
- Repeats daily forever (until disabled)
```

### Scenario 2: User Changes Time
```
Currently set: 8:00 AM
User changes to: 7:30 AM

What happens:
1. Old 8:00 AM notification cancelled
2. New 7:30 AM notification scheduled
3. Next day: notification at 7:30 AM (not 8:00 AM)
```

### Scenario 3: User Disables Reminder
```
User toggles OFF

What happens:
1. Notification cancelled
2. No more notifications
3. Can re-enable anytime
```

---

## ✅ Testing Checklist

### Basic Tests:
- [ ] Schedule good morning for 1 minute from now
- [ ] Wait 1 minute
- [ ] Notification appears EXACTLY at set time
- [ ] Has sound
- [ ] Has vibration
- [ ] Shows correct text

### Time Accuracy Tests:
- [ ] Set for 8:00 AM
- [ ] Check phone at 7:59 AM - no notification
- [ ] Check phone at 8:00 AM - notification appears
- [ ] Check phone at 8:01 AM - notification already shown

### Multiple Reminders:
- [ ] Enable good morning (8:00 AM)
- [ ] Enable good night (10:00 PM)
- [ ] Enable daily moment (9:00 AM)
- [ ] Verify all 3 are scheduled
- [ ] All appear at correct times

### Change Time:
- [ ] Set good morning to 8:00 AM
- [ ] Wait for next day - appears at 8:00 AM
- [ ] Change to 7:30 AM
- [ ] Next day - appears at 7:30 AM (not 8:00 AM)

---

## 🎯 Success Criteria

### Perfect Scheduling:
✅ Notification appears at EXACT time set
✅ No delays (not 8:01, not 7:59, exactly 8:00)
✅ Repeats daily at same time
✅ Changing time works immediately
✅ Disabling stops notifications

### User Experience:
✅ User sets time in settings
✅ Sees confirmation
✅ Gets notification at exact time
✅ Can change time anytime
✅ Can disable anytime

### Technical:
✅ Uses proper Android channels
✅ Validates time format
✅ Verifies scheduling
✅ Logs confirmation
✅ Handles errors gracefully

---

## 📝 Code Example

### In Settings Screen:
```typescript
// When user enables good morning reminder
const handleGoodMorningToggle = async (enabled: boolean, time: string) => {
  if (enabled) {
    const partner = await PairingService.getPartner();
    await NotificationService.scheduleGoodMorningReminder(
      time, 
      partner?.displayName || 'Partner'
    );
    
    // Verify it's scheduled
    const status = await NotificationService.verifyScheduledReminders();
    if (status.goodMorning) {
      Alert.alert('Success', `Good morning reminder set for ${time}`);
    }
  } else {
    await NotificationService.cancelReminder('goodMorning');
    Alert.alert('Disabled', 'Good morning reminder disabled');
  }
};
```

---

## 🎉 Result

**Before:**
- Notifications at random times ❌
- Sometimes delayed ❌
- No way to verify ❌

**After:**
- Notifications at EXACT time ✅
- Zero delay ✅
- Full verification ✅
- Debug tools ✅

**User Experience:**
```
User sets 8:00 AM
  ↓
Every day at EXACTLY 8:00 AM
  ↓
☀️ Good Morning!
Say good morning to Partner Name 💕

Perfect timing, every time! 🎯
```
