package com.pairly.app.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.pairly.app.MainActivity

/**
 * Handles widget tap detection for double-tap reactions
 * Single tap = Open app (after 400ms delay via AlarmManager)
 * Double tap = Open reaction picker (cancels pending single-tap)
 */
class WidgetTapReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_WIDGET_TAP = "com.pairly.app.widget.WIDGET_TAP"
        const val ACTION_DELAYED_OPEN_APP = "com.pairly.app.widget.DELAYED_OPEN_APP"
        const val EXTRA_WIDGET_TYPE = "widget_type"
        const val TYPE_SIMPLE = "simple"
        const val TYPE_POLAROID = "polaroid"
        
        private const val DOUBLE_TAP_TIMEOUT = 350L // ms (slightly faster for better UX)
        private const val PREFS_NAME = "widget_tap_prefs"
        private const val KEY_LAST_TAP = "last_tap_time"
        private const val REQUEST_CODE_DELAYED = 9999
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_WIDGET_TAP -> handleWidgetTap(context, intent)
            ACTION_DELAYED_OPEN_APP -> {
                // This fires after timeout - open app
                println("📱 [WidgetTap] Delayed action - opening app")
                openMainApp(context)
            }
        }
    }
    
    private fun handleWidgetTap(context: Context, intent: Intent) {
        val widgetType = intent.getStringExtra(EXTRA_WIDGET_TYPE) ?: TYPE_SIMPLE
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val lastTap = prefs.getLong(KEY_LAST_TAP, 0)
        val timeSinceLastTap = now - lastTap
        
        println("📱 [WidgetTap] Tap received. Time since last: ${timeSinceLastTap}ms")
        
        // Always cancel pending delayed app open
        cancelDelayedAppOpen(context)
        
        if (timeSinceLastTap < DOUBLE_TAP_TIMEOUT && lastTap > 0) {
            // DOUBLE TAP detected!
            println("✨ [WidgetTap] DOUBLE TAP! Opening reactions...")
            prefs.edit().putLong(KEY_LAST_TAP, 0).apply() // Reset
            openReactionPicker(context, widgetType)
        } else {
            // First tap - save time and schedule delayed app open
            println("👆 [WidgetTap] First tap, waiting for possible double tap...")
            prefs.edit().putLong(KEY_LAST_TAP, now).apply()
            
            // Schedule delayed app open (will be cancelled if second tap comes)
            scheduleDelayedAppOpen(context)
        }
    }
    
    private fun scheduleDelayedAppOpen(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, WidgetTapReceiver::class.java).apply {
                action = ACTION_DELAYED_OPEN_APP
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, 
                REQUEST_CODE_DELAYED, 
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            
            // Schedule to fire after timeout
            val triggerTime = System.currentTimeMillis() + DOUBLE_TAP_TIMEOUT
            alarmManager.set(AlarmManager.RTC, triggerTime, pendingIntent)
            println("⏰ [WidgetTap] Scheduled delayed app open in ${DOUBLE_TAP_TIMEOUT}ms")
        } catch (e: Exception) {
            println("❌ [WidgetTap] Failed to schedule: ${e.message}")
            // Fallback - just open app immediately
            openMainApp(context)
        }
    }
    
    private fun cancelDelayedAppOpen(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, WidgetTapReceiver::class.java).apply {
                action = ACTION_DELAYED_OPEN_APP
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, 
                REQUEST_CODE_DELAYED, 
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            println("🚫 [WidgetTap] Cancelled pending app open")
        } catch (e: Exception) {
            println("⚠️ [WidgetTap] Failed to cancel: ${e.message}")
        }
    }
    
    private fun openMainApp(context: Context) {
        try {
            // Clear last tap time
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putLong(KEY_LAST_TAP, 0).apply()
                
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            println("❌ [WidgetTap] Failed to open app: ${e.message}")
        }
    }
    
    private fun openReactionPicker(context: Context, widgetType: String) {
        try {
            val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            val momentId = if (widgetType == TYPE_POLAROID) {
                prefs.getString("polaroid_moment_id", null)
            } else {
                prefs.getString("current_moment_id", null)
            }
            
            if (momentId == null) {
                println("⚠️ [WidgetTap] No moment ID, opening app instead")
                openMainApp(context)
                return
            }
            
            val intent = Intent(context, ReactionPickerActivity::class.java).apply {
                putExtra(ReactionPickerActivity.EXTRA_MOMENT_ID, momentId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            context.startActivity(intent)
            println("✅ [WidgetTap] Opened reaction picker for moment: $momentId")
        } catch (e: Exception) {
            println("❌ [WidgetTap] Failed to open reactions: ${e.message}")
            openMainApp(context)
        }
    }
}
