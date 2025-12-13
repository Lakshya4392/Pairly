package com.pairly.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.AsyncTask
import android.util.Base64
import android.widget.RemoteViews
import com.pairly.app.MainActivity
import com.pairly.app.R
import java.net.HttpURLConnection
import java.net.URL

/**
 * Premium Pairly Widget with image support
 */
class PairlyWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidgetWithDefault(context, appWidgetManager, appWidgetId)
            // Try to fetch latest photo in background
            FetchPhotoTask(context, appWidgetManager, appWidgetId).execute()
        }
    }

    private fun updateWidgetWithDefault(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        try {
            val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
            
            views.setTextViewText(R.id.widget_title, "💕 Pairly")
            views.setTextViewText(R.id.widget_main_text, "Share a Moment")
            views.setTextViewText(R.id.widget_sub_text, "Tap to capture")
            views.setTextViewText(R.id.widget_status_text, "Ready")
            views.setImageViewResource(R.id.widget_image, R.drawable.widget_placeholder)
            
            // Click handler
            val intent = Intent(context, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Exception) {
            // Silent fail
        }
    }

    companion object {
        private const val API_URL = "https://pairly-60qj.onrender.com"
    }

    /**
     * Background task to fetch partner's latest photo
     */
    private class FetchPhotoTask(
        private val context: Context,
        private val appWidgetManager: AppWidgetManager,
        private val appWidgetId: Int
    ) : AsyncTask<Void, Void, Bitmap?>() {

        override fun doInBackground(vararg params: Void?): Bitmap? {
            try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val authToken = prefs.getString("auth_token", null) ?: return null
                val userId = prefs.getString("user_id", null) ?: return null

                val url = URL("$API_URL/moments/latest?userId=$userId")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $authToken")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    
                    // Parse JSON to get photo base64
                    val photoRegex = "\"photo\"\\s*:\\s*\"([^\"]+)\"".toRegex()
                    val match = photoRegex.find(response)
                    
                    if (match != null) {
                        val base64Photo = match.groupValues[1]
                        // Remove data:image prefix if present
                        val cleanBase64 = base64Photo.replace("data:image/[^;]+;base64,".toRegex(), "")
                        val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                        return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                    }
                }
                connection.disconnect()
            } catch (e: Exception) {
                // Silent fail
            }
            return null
        }

        override fun onPostExecute(bitmap: Bitmap?) {
            if (bitmap != null) {
                try {
                    val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
                    
                    views.setTextViewText(R.id.widget_title, "💕 Pairly")
                    views.setTextViewText(R.id.widget_main_text, "New Moment!")
                    views.setTextViewText(R.id.widget_sub_text, "From your partner 💝")
                    views.setTextViewText(R.id.widget_status_text, "New")
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    
                    // Click handler
                    val intent = Intent(context, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    val pendingIntent = PendingIntent.getActivity(
                        context, appWidgetId, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
                    
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                } catch (e: Exception) {
                    // Silent fail
                }
            }
        }
    }
}
