package com.pairly.app.widget

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Background service to handle widget reaction button clicks.
 * Sends reaction to backend and notifies partner.
 */
class ReactionService : Service() {

    companion object {
        private const val TAG = "ReactionService"
        const val EXTRA_MOMENT_ID = "momentId"
        const val EXTRA_EMOJI = "emoji"
        
        /**
         * Create intent to send a reaction
         */
        fun createIntent(context: Context, momentId: String, emoji: String): Intent {
            return Intent(context, ReactionService::class.java).apply {
                putExtra(EXTRA_MOMENT_ID, momentId)
                putExtra(EXTRA_EMOJI, emoji)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val momentId = intent?.getStringExtra(EXTRA_MOMENT_ID)
        val emoji = intent?.getStringExtra(EXTRA_EMOJI)

        if (momentId != null && emoji != null) {
            Log.d(TAG, "💝 Sending reaction: $emoji for moment: $momentId")
            sendReaction(momentId, emoji)
        } else {
            Log.e(TAG, "❌ Missing momentId or emoji")
        }

        return START_NOT_STICKY
    }

    /**
     * Send reaction to backend API
     */
    private fun sendReaction(momentId: String, emoji: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val authToken = prefs.getString("auth_token", null)
                val baseUrl = prefs.getString("backend_url", "https://pairly-60qj.onrender.com")?.trimEnd('/')

                if (authToken == null) {
                    Log.e(TAG, "❌ No auth token - cannot send reaction")
                    stopSelf()
                    return@launch
                }

                val url = URL("$baseUrl/moments/$momentId/react")
                val connection = url.openConnection() as HttpURLConnection
                
                connection.apply {
                    requestMethod = "POST"
                    setRequestProperty("Authorization", "Bearer $authToken")
                    setRequestProperty("Content-Type", "application/json")
                    connectTimeout = 10000
                    readTimeout = 10000
                    doOutput = true
                }

                // Send JSON body
                val jsonBody = JSONObject().apply {
                    put("emoji", emoji)
                }

                OutputStreamWriter(connection.outputStream).use { writer ->
                    writer.write(jsonBody.toString())
                    writer.flush()
                }

                val responseCode = connection.responseCode
                
                if (responseCode == 200) {
                    Log.d(TAG, "✅ Reaction sent successfully!")
                    
                    // Update widget to show reaction was sent
                    // (Optional: show a brief toast or animation)
                } else {
                    val errorStream = connection.errorStream?.bufferedReader()?.readText()
                    Log.e(TAG, "❌ Reaction failed with code: $responseCode - $errorStream")
                }

                connection.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error sending reaction: ${e.message}", e)
            } finally {
                stopSelf()
            }
        }
    }
}
