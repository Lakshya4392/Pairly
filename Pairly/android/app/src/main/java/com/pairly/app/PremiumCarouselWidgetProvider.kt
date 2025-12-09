package com.pairly.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews

class PremiumCarouselWidgetProvider : AppWidgetProvider() {
    
    companion object {
        fun forceUpdate(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(
                    ComponentName(context, PremiumCarouselWidgetProvider::class.java)
                )
                if (appWidgetIds.isNotEmpty()) {
                    Log.d("PairlyWidget", "Force updating ${appWidgetIds.size} widgets")
                    PremiumCarouselWidgetProvider().onUpdate(context, appWidgetManager, appWidgetIds)
                }
            } catch (e: Exception) {
                Log.e("PairlyWidget", "Force update error", e)
            }
        }

        // ⚡ HELPER: Downsample image to avoid TransactionTooLargeException
        private fun decodeSampledBitmapFromFile(path: String, reqWidth: Int, reqHeight: Int): android.graphics.Bitmap? {
            // First decode with inJustDecodeBounds=true to check dimensions
            val options = android.graphics.BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            android.graphics.BitmapFactory.decodeFile(path, options)

            // Calculate inSampleSize
            options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight)

            // Decode bitmap with inSampleSize set
            options.inJustDecodeBounds = false
            return android.graphics.BitmapFactory.decodeFile(path, options)
        }

        private fun calculateInSampleSize(options: android.graphics.BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
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
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d("PairlyWidget", "onUpdate called for ${appWidgetIds.size} widgets")
        
        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_premium_carousel)
                
                // 1. Read data from SharedPreferences
                val prefs = context.getSharedPreferences("PairlyPrefs", Context.MODE_PRIVATE)
                val partnerName = prefs.getString("partner_name", "Partner")
                val photoPath = prefs.getString("photo_path", null)
                val timestamp = System.currentTimeMillis() // Or read saved timestamp if needed

                // 2. Update Image
                if (photoPath != null) {
                    try {
                        // ⚡ SAFE LOAD: Downsample to max 800x800 to prevent IPC crash
                        val bitmap = decodeSampledBitmapFromFile(photoPath, 800, 800)
                        if (bitmap != null) {
                            views.setImageViewBitmap(R.id.widget_image, bitmap)
                            Log.d("PairlyWidget", "✅ Loaded SAFE bitmap from $photoPath")
                        } else {
                            Log.e("PairlyWidget", "❌ Failed to decode bitmap from $photoPath")
                        }
                    } catch (e: Exception) {
                        Log.e("PairlyWidget", "❌ Exception decoding bitmap", e)
                    }
                }

                // 3. Update Text
                views.setTextViewText(R.id.widget_partner_name, partnerName)
                
                // 4. Set click to open app
                val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    val pendingIntent = PendingIntent.getActivity(
                        context, 
                        0, 
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
                }
                
                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d("PairlyWidget", "Widget $appWidgetId updated successfully")
            } catch (e: Exception) {
                Log.e("PairlyWidget", "Error updating widget $appWidgetId", e)
            }
        }
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("PairlyWidget", "Widget enabled")
    }
    
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("PairlyWidget", "Widget disabled")
    }
}
