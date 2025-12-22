package com.pairly.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import android.os.AsyncTask
import android.widget.RemoteViews
import com.pairly.app.MainActivity
import com.pairly.app.R
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Pairly Widget V3 - Canvas Drawn "Elegant Gold"
 * Renders the entire widget UI to a Bitmap for pixel-perfect control.
 */
class PairlyV3Widget : AppWidgetProvider() {

    companion object {
        private const val API_URL = "https://pairly-60qj.onrender.com"
        const val ACTION_REFRESH = "com.pairly.app.widget.V3_REFRESH"

        // Gold Color
        private const val COLOR_GOLD = "#C5A059"
        private const val COLOR_TEXT = "#000000"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, PairlyV3Widget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

                val widget = PairlyV3Widget()
                widget.onUpdate(context, appWidgetManager, appWidgetIds)
            } catch (e: Exception) {
                println("❌ [V3Widget] Update all error: ${e.message}")
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            updateAllWidgets(context)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            // Start async task to fetch data and draw
            FetchAndDrawTask(context, appWidgetManager, appWidgetId).execute()
        }
    }

    private inner class FetchAndDrawTask(
        private val context: Context,
        private val appWidgetManager: AppWidgetManager,
        private val appWidgetId: Int
    ) : AsyncTask<Void, Void, Bitmap?>() {

        override fun doInBackground(vararg params: Void?): Bitmap? {
            try {
                // 1. Fetch Photo
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val userId = prefs.getString("user_id", null)
                val token = prefs.getString("auth_token", null)

                var photoBitmap: Bitmap? = null
                
                if (userId != null && token != null) {
                    val url = URL("$API_URL/moments/latest?userId=$userId")
                    val connection = url.openConnection() as HttpURLConnection
                    connection.setRequestProperty("Authorization", "Bearer $token")
                    connection.connectTimeout = 5000
                    
                    if (connection.responseCode == 200) {
                        val response = connection.inputStream.bufferedReader().readText()
                        val photoUrlMatch = Regex("\"photoData\":\"(https://[^\"]+)\"").find(response)
                        val photoUrl = photoUrlMatch?.groupValues?.get(1)
                        
                        if (photoUrl != null) {
                            val imgUrl = URL(photoUrl)
                            photoBitmap = BitmapFactory.decodeStream(imgUrl.openConnection().getInputStream())
                        }
                    }
                    connection.disconnect()
                }

                // 2. Prepare Names & Date
                // Generic fallback for now
                val topText = "You & Partner" 
                
                val dateFormat = SimpleDateFormat("EEE, MMM d, h:mm a", Locale.getDefault())
                val dateText = dateFormat.format(Date())

                // 3. Draw the Canvas
                return drawWidget(context, photoBitmap, topText, dateText)

            } catch (e: Exception) {
                println("❌ [V3Widget] Draw error: ${e.message}")
                return null
            }
        }

        override fun onPostExecute(bitmap: Bitmap?) {
            if (bitmap != null) {
                val views = RemoteViews(context.packageName, R.layout.pairly_widget_v3)
                views.setImageViewBitmap(R.id.widget_image, bitmap)

                // Click Intent
                val intent = Intent(context, MainActivity::class.java)
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
    }

    /**
     * Core Drawing Logic
     */
    private fun drawWidget(context: Context, photo: Bitmap?, topText: String, dateText: String): Bitmap {
        // Size: 500x500 px (High res square)
        val size = 500
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Paints
        val bgPaint = Paint().apply {
            color = Color.WHITE
            style = Paint.Style.FILL
            isAntiAlias = true
            setShadowLayer(10f, 0f, 5f, Color.LTGRAY)
        }

        val ringPaint = Paint().apply {
            color = Color.parseColor(COLOR_GOLD)
            style = Paint.Style.STROKE
            strokeWidth = 14f // Slightly thicker for boldness
            isAntiAlias = true
        }
        
        val ringInnerPaint = Paint().apply {
            color = Color.parseColor(COLOR_GOLD)
            style = Paint.Style.STROKE
            strokeWidth = 5f
            isAntiAlias = true
        }

        val textPaint = Paint().apply {
            color = Color.BLACK
            textSize = 38f // Restored size slightly
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }
        
        val datePaint = Paint().apply {
            color = Color.GRAY
            textSize = 22f
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }
        
        val emojiPaint = Paint().apply {
            textSize = 80f
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }

        // 1. Draw Background (Rounded Card)
        // Margin 30f (Slightly reduced to allow bigger card)
        val rect = RectF(30f, 30f, size - 30f, size - 30f)
        canvas.drawRoundRect(rect, 50f, 50f, bgPaint)

        // 2. Draw Photo (Circular)
        // Center: 250, 275 (Shifted DOWN by 25px to give Text room at top)
        val cx = size / 2f
        val cy = size / 2f + 25f 
        // Radius: Increased to 135f for bigger impact
        val photoRadius = 135f
        
        // Photo Mask Radius
        val maskRadius = photoRadius - 5f // 130f
        
        if (photo != null) {
            val scaledPhoto = Bitmap.createScaledBitmap(photo, 280, 280, true)
            val shaderBitmap = Bitmap.createBitmap(280, 280, Bitmap.Config.ARGB_8888)
            val shaderCanvas = Canvas(shaderBitmap)
            val shaderPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            
            // Draw circle mask
            shaderCanvas.drawCircle(140f, 140f, 130f, shaderPaint)
            // Draw photo source
            shaderPaint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
            shaderCanvas.drawBitmap(scaledPhoto, 0f, 0f, shaderPaint)
            
            // Draw on main canvas (Centered)
            canvas.drawBitmap(shaderBitmap, cx - 140, cy - 140, null)
        } else {
            // Placeholder
            canvas.drawText("❤️", cx, cy + 30, emojiPaint) 
        }

        // 3. Draw Gold Rings
        canvas.drawCircle(cx, cy, photoRadius + 12, ringInnerPaint) // Inner thin
        canvas.drawCircle(cx, cy, photoRadius + 28, ringPaint)      // Outer thick

        // 4. Draw Curved Text (Top Name)
        // Path for text to follow (Arc above the photo)
        val textPath = Path()
        // Radius: Tighter to the ring (60f offset instead of 80+)
        val arcRadius = photoRadius + 65f 
        val oval = RectF(cx - arcRadius, cy - arcRadius, cx + arcRadius, cy + arcRadius)
        
        // Sweep -180 to 0 (Top half). 
        textPath.addArc(oval, 180f, 180f)
        
        // Draw text on path (VOffset -5 to lift slightly off ring)
        canvas.drawTextOnPath(topText, textPath, 0f, -10f, textPaint)

        // 5. Draw Date (Bottom)
        // Check standard bounds: Size 500. Margin 30. Bottom is 470.
        // Ring Bottom is ~440.
        // Move Text to 465 to sit nicely below ring (was 440)
        canvas.drawText(dateText, cx, size - 38f, datePaint)

        return bitmap
    }
}
