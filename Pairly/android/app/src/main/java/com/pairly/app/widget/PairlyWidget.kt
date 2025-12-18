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

    companion object {
        // Shared logic for updating a single widget
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
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
                        // ⚡ FIX: Downsample image to avoid TransactionTooLargeException
                        // RemoteViews update fails silentlly if payload > 1MB
                        // 512x512 is safe (approx 1MB max raw data)
                        val bitmap = decodeSampledBitmapFromFile(imgFile.absolutePath, 512, 512)
                        
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

        // Helper to be called from Native Module to force refresh
        fun updateAllWidgets(context: Context) {
             try {
                 val appWidgetManager = AppWidgetManager.getInstance(context)
                 val componentName = android.content.ComponentName(context, PairlyWidget::class.java)
                 val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                 
                 // 1. Force Direct Update (Bypass Broadcast Latency)
                 for (appWidgetId in appWidgetIds) {
                     updateWidget(context, appWidgetManager, appWidgetId)
                 }

                 // 2. Also send Broadcast (Standard Practice for System Awareness)
                 val intent = Intent(context, PairlyWidget::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                context.sendBroadcast(intent)
             } catch (e: Exception) {
                 e.printStackTrace()
             }
        }
        // Helper to load scaled bitmap
        private fun decodeSampledBitmapFromFile(path: String, reqWidth: Int, reqHeight: Int): Bitmap? {
            try {
                // First decode with inJustDecodeBounds=true to check dimensions
                val options = BitmapFactory.Options()
                options.inJustDecodeBounds = true
                BitmapFactory.decodeFile(path, options)

                // Calculate inSampleSize
                options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight)

                // Decode bitmap with inSampleSize set
                options.inJustDecodeBounds = false
                return BitmapFactory.decodeFile(path, options)
            } catch (e: Exception) {
                return null
            }
        }

        private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
            // Raw height and width of image
            val (height: Int, width: Int) = options.run { outHeight to outWidth }
            var inSampleSize = 1

            if (height > reqHeight || width > reqWidth) {
                val halfHeight: Int = height / 2
                val halfWidth: Int = width / 2

                // Calculate the largest inSampleSize value that is a power of 2 and keeps both
                // height and width larger than the requested height and width.
                while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                    inSampleSize *= 2
                }
            }

            return inSampleSize
        }
    }
}
