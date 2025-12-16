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
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Premium Pairly Widget with Instant Updates
 */
class PairlyWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        try {
            val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
            
            // 1. Try to load local file (INSTANT UPDATE)
            val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            val lastMomentPath = prefs.getString("last_moment_path", null)
            val senderName = prefs.getString("last_moment_sender", "Partner")
            val timestamp = prefs.getString("last_moment_timestamp", null)

            var imageLoaded = false

            if (lastMomentPath != null) {
                val imgFile = File(lastMomentPath)
                if (imgFile.exists()) {
                    val bitmap = BitmapFactory.decodeFile(imgFile.absolutePath)
                    if (bitmap != null) {
                        views.setImageViewBitmap(R.id.widget_image, bitmap)
                        views.setTextViewText(R.id.widget_sender_name, senderName)
                        views.setTextViewText(R.id.widget_timestamp, formatTimestamp(timestamp))
                        imageLoaded = true
                    }
                }
            }

            // 2. If no local image, show default state (waiting for sync)
            if (!imageLoaded) {
                 views.setImageViewResource(R.id.widget_image, R.drawable.widget_placeholder)
                 views.setTextViewText(R.id.widget_sender_name, "Pairly")
                 views.setTextViewText(R.id.widget_timestamp, "Tap to share a moment")
            }
            
            // Click handler
            val intent = Intent(context, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
            
            // Trigger background fetch only if necessary (or periodically)
            // For now, we rely on FCM pushing the file to us.
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun formatTimestamp(timestampStr: String?): String {
        if (timestampStr == null) return "Just now"
        try {
            val ts = timestampStr.toLong()
            val sdf = SimpleDateFormat("h:mm a", Locale.getDefault()) // e.g. 10:30 PM
            return sdf.format(Date(ts))
        } catch (e: Exception) {
            return "New Moment"
        }
    }

    companion object {
        // Helper to be called from Native Module to force refresh
        fun updateAllWidgets(context: Context) {
             val intent = Intent(context, PairlyWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            context.sendBroadcast(intent)
        }
    }
}
