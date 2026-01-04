package com.pairly.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.pairly.app.widget.PairlyWidget
import com.pairly.app.widget.PairlyPolaroidWidget

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

/**
 * Native FCM Service for handling push notifications when app is killed.
 * This service runs independently of React Native and can update the widget
 * even when the app process is completely dead.
 */
class PairlyMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "PairlyMessaging"
        private const val CHANNEL_ID = "moments"
        private const val CHANNEL_NAME = "Moments"
        private const val PING_CHANNEL_ID = "thinking_ping_v3" // 🔥 FORCE NEW CHANNEL (No Sound)
        private const val PING_CHANNEL_NAME = "Thinking of You"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.d(TAG, "📱 PairlyMessagingService created")
    }

    /**
     * Called when FCM message is received.
     * This runs even when app is killed (for data-only messages).
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        Log.d(TAG, "📥 FCM Message received from: ${remoteMessage.from}")
        Log.d(TAG, "📦 Data payload: ${remoteMessage.data}")

        val data = remoteMessage.data
        
        when (data["type"]) {
            "new_moment" -> {
                Log.d(TAG, "📸 New moment notification - handling in native")
                handleNewMoment(data)
            }
            "new_photo" -> {
                Log.d(TAG, "📸 New photo notification - handling in native")
                handleNewMoment(data) // Same handling
            }
            "thinking_ping" -> {
                Log.d(TAG, "💭 Thinking ping received!")
                handleThinkingPing(data)
            }
            else -> {
                Log.d(TAG, "⚠️ Unknown message type: ${data["type"]}")
                // Let React Native handle other types when app is open
            }
        }
    }

    // ... (handleNewMoment remains unchanged) ...
    private fun handleNewMoment(data: Map<String, String>) {
        val photoUrl = data["photoUrl"]
        val partnerName = data["partnerName"] ?: "Partner"
        val momentId = data["momentId"] ?: "unknown"
        val expiresInStr = data["expiresIn"] // "0.167", "1", "24" etc.

        Log.d(TAG, "🖼️ Photo URL: $photoUrl")
        Log.d(TAG, "👤 Partner: $partnerName")
        Log.d(TAG, "⏱️ Expires In (Hours): $expiresInStr")

        // Parse Expiry
        var expiryTimestamp: Long = 0
        if (!expiresInStr.isNullOrEmpty()) {
            try {
                val hours = expiresInStr.toDouble()
                if (hours > 0) {
                    expiryTimestamp = System.currentTimeMillis() + (hours * 3600 * 1000).toLong()
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error parsing expiresIn: $expiresInStr")
            }
        }

        // Use coroutine for background work
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (!photoUrl.isNullOrEmpty()) {
                    // Download photo
                    val bitmap = downloadPhoto(photoUrl)
                    
                    if (bitmap != null) {
                        Log.d(TAG, "✅ Photo downloaded successfully")
                        
                        // Update widget on main thread
                        withContext(Dispatchers.Main) {
                            PairlyWidget.updateWithPhoto(
                                applicationContext,
                                bitmap,
                                partnerName,
                                momentId,
                                expiryTimestamp // 🔥 Pass Custom Expiry
                            )
                            // Also update Polaroid widget
                            PairlyPolaroidWidget.updateWithPhoto(
                                applicationContext,
                                bitmap,
                                momentId
                            )

                            
                            Log.d(TAG, "✅ All widgets updated (Expiry: ${if (expiryTimestamp > 0) "Custom" else "Default 24h"})")
                        }
                    } else {
                        Log.e(TAG, "❌ Failed to download photo")
                        // Still refresh widget to try API polling
                        withContext(Dispatchers.Main) {
                            PairlyWidget.updateAllWidgets(applicationContext)
                        }
                    }
                } else {
                    Log.d(TAG, "⚠️ No photo URL, triggering widget refresh via API")
                    // No URL provided, trigger regular widget refresh
                    withContext(Dispatchers.Main) {
                        PairlyWidget.updateAllWidgets(applicationContext)
                    }
                }

                // Show notification
                withContext(Dispatchers.Main) {
                    showMomentNotification(partnerName, momentId)
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error handling new moment: ${e.message}", e)
                // Fallback: try regular widget refresh
                withContext(Dispatchers.Main) {
                    PairlyWidget.updateAllWidgets(applicationContext)
                }
            }
        }
    }

    // ... (downloadPhoto same) ...
    private fun downloadPhoto(photoUrl: String): Bitmap? {
        return try {
            Log.d(TAG, "⬇️ Downloading photo from: $photoUrl")
            
            val url = URL(photoUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.doInput = true
            connection.connect()

            if (connection.responseCode == 200) {
                val inputStream = connection.inputStream
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()
                connection.disconnect()
                
                Log.d(TAG, "✅ Photo downloaded: ${bitmap?.width}x${bitmap?.height}")
                bitmap
            } else {
                Log.e(TAG, "❌ Download failed with code: ${connection.responseCode}")
                connection.disconnect()
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Download error: ${e.message}", e)
            null
        }
    }

    // ... (showMomentNotification same) ...
    private fun showMomentNotification(partnerName: String, momentId: String) {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Create intent to open app
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("momentId", momentId)
            }
            
            val pendingIntent = PendingIntent.getActivity(
                this,
                momentId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("💕 New Moment from $partnerName")
                .setContentText("Tap to view your special moment together")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setColor(0xFFFF6B9D.toInt())
                .build()

            notificationManager.notify(momentId.hashCode(), notification)
            Log.d(TAG, "✅ Notification shown")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error showing notification: ${e.message}", e)
        }
    }

    /**
     * Handle thinking ping - vibrate and show notification
     */
    private fun handleThinkingPing(data: Map<String, String>) {
        val senderName = data["senderName"] ?: "Your partner"
        
        Log.d(TAG, "💭 Thinking ping from: $senderName")
        
        // 1. Show Notification FIRST (Silent)
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Use PING_CHANNEL_ID (v3) - No Sound, No Vibrate
        val notification = NotificationCompat.Builder(this, PING_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("💭 Thinking of You")
            .setContentText("$senderName is thinking of you right now 💕")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVibrate(longArrayOf(0)) // Ensure no system vibration
            .setSound(null)              // 🔥 Ensure no sound
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setColor(0xFFFF6B9D.toInt())
            .build()
        
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
        Log.d(TAG, "✅ Thinking ping notification shown (SILENT)")

        // 2. Start Custom Vibration (Heartbeat)
        Log.d(TAG, "📱 Starting custom vibration...")
        
        // Vibrate phone with romantic heartbeat pattern (~5 seconds)
        // Pattern: beat-beat pause beat-beat pause beat-beat pause beat-beat
        try {
            // Heartbeat Pattern
            val heartbeatPattern = longArrayOf(
                0,    
                200, 150, 200, 500,   // Beat-Beat ...
                200, 150, 200, 500,   
                200, 150, 200, 500,   
                200, 150, 200, 500,   
                300, 200, 300, 0      
            )
            
            // Get vibrator
            val vibrator: android.os.Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as android.os.VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
            }
            
            if (vibrator.hasVibrator()) {
                // Use RING usage to ensure it vibrates even if notification volume is low (but not silent)
                // Or ALARM if we want to be really annoying, but NOTIFICATION is standard.
                // User wants "Thinking", so SONIFICATION/NOTIFICATION is correct.
                val audioAttributes = android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                    .build()

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val effect = android.os.VibrationEffect.createWaveform(heartbeatPattern, -1)
                    vibrator.vibrate(effect, audioAttributes)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(heartbeatPattern, -1, audioAttributes)
                }
                Log.d(TAG, "💓 Heartbeat vibration triggered")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Vibration error: ${e.message}")
        }
    }

    /**
     * Create notification channels (required for Android 8+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Main moments channel - Default Sound/Vibrate
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for new moments"
                enableLights(true)
                enableVibration(true)
            }

            // Ping channel v3 - NO SOUND, NO VIBRATION (System level)
            val pingChannel = NotificationChannel(
                PING_CHANNEL_ID,
                PING_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Thinking of You ping notifications"
                enableLights(true)
                enableVibration(false) // No System Vibrate
                vibrationPattern = longArrayOf(0)
                setSound(null, null)   // 🔥 No System Sound
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
            notificationManager.createNotificationChannel(pingChannel)
            Log.d(TAG, "✅ Notification channels created (moments + ping v3)")
        }
    }

    /**
     * Called when FCM token is refreshed
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "🔄 FCM Token refreshed: $token")
        
        // Save token to SharedPreferences for later sync with backend
        val prefs = getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("fcm_token_native", token).apply()
        
        // Note: Token will be synced to backend when app opens
        // We can't call RN from here, but the RN FCMService will pick it up
    }
}
