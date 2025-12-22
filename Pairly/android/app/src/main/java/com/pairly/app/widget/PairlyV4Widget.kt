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
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.AsyncTask
import android.widget.RemoteViews
import com.pairly.app.MainActivity
import com.pairly.app.R
import java.net.HttpURLConnection
import java.net.URL
import java.util.Random

/**
 * Pairly Widget V4 - "Pink Heart"
 * Features: Gradient Background, Heart-Shaped Photo, Floating Particles.
 */
class PairlyV4Widget : AppWidgetProvider() {

    companion object {
        private const val API_URL = "https://pairly-60qj.onrender.com"
        const val ACTION_REFRESH = "com.pairly.app.widget.V4_REFRESH"

        // Pink Palette
        private const val COLOR_PINK_LIGHT = "#FFB6C1"
        private const val COLOR_PINK_DEEP = "#FF69B4"
        private const val COLOR_PEACH = "#FFE4E1"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, PairlyV4Widget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

                val widget = PairlyV4Widget()
                widget.onUpdate(context, appWidgetManager, appWidgetIds)
            } catch (e: Exception) {
                println("❌ [V4Widget] Update all error: ${e.message}")
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
                        val match = Regex("\"photoData\":\"(https://[^\"]+)\"").find(response)
                        val photoUrl = match?.groupValues?.get(1)
                        if (photoUrl != null) {
                            photoBitmap = BitmapFactory.decodeStream(URL(photoUrl).openConnection().getInputStream())
                        }
                    }
                    connection.disconnect()
                }

                val topText = "Loved by Partner" 

                return drawWidget(context, photoBitmap, topText)
            } catch (e: Exception) {
                return null
            }
        }

        override fun onPostExecute(bitmap: Bitmap?) {
            if (bitmap != null) {
                val views = RemoteViews(context.packageName, R.layout.pairly_widget_v4)
                views.setImageViewBitmap(R.id.widget_image, bitmap)

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

    private fun drawWidget(context: Context, photo: Bitmap?, topText: String): Bitmap {
        val size = 500
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // 1. Background Gradient (Pink to Peach)
        val bgPaint = Paint().apply {
            isAntiAlias = true
            style = Paint.Style.FILL
            shader = LinearGradient(0f, 0f, size.toFloat(), size.toFloat(),
                Color.parseColor(COLOR_PINK_LIGHT),
                Color.parseColor(COLOR_PEACH),
                Shader.TileMode.CLAMP)
        }
        val rect = RectF(20f, 20f, size - 20f, size - 20f)
        canvas.drawRoundRect(rect, 60f, 60f, bgPaint)

        // 2. Particles (Random Hearts/Dots)
        val particlePaint = Paint().apply {
            color = Color.WHITE
            alpha = 150 // Semi-transparent
            isAntiAlias = true
        }
        val random = Random(123) // Seed for consistency
        for (i in 0..15) {
            val x = 40f + random.nextFloat() * (size - 80f)
            val y = 40f + random.nextFloat() * (size - 80f)
            val r = 5f + random.nextFloat() * 10f
            canvas.drawCircle(x, y, r, particlePaint)
        }

        // 3. Heart Shape Mask Calculation
        val cx = size / 2f
        val cy = size / 2f + 30 // Shift down slightly more for text room
        val width = 340f  // Increased from 280
        val height = 300f // Increased from 250
        
        val heartPath = Path()
        // Improve Heart Shape Logic (Cubic Bezier)
        // Starting at top center notch
        heartPath.moveTo(cx, cy - height/2 + 50) 
        // Right lobe
        heartPath.cubicTo(
            cx + width/2, cy - height/2 - 50, // Control 1
            cx + width/2 + 50, cy + 30,       // Control 2
            cx, cy + height/2 + 20            // End (Bottom tip)
        )
        // Left lobe
        heartPath.cubicTo(
            cx - width/2 - 50, cy + 30,       // Control 1
            cx - width/2, cy - height/2 - 50, // Control 2
            cx, cy - height/2 + 50            // End (Top notch)
        )
        heartPath.close()

        // 4. Draw Photo inside Heart
        if (photo != null) {
            val scaledPhoto = Bitmap.createScaledBitmap(photo, 400, 400, true) // Scaled up
            val shaderBitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val shaderCanvas = Canvas(shaderBitmap)
            val shaderPaint = Paint(Paint.ANTI_ALIAS_FLAG)

            shaderCanvas.drawPath(heartPath, shaderPaint)
            shaderPaint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
            
            // Center the photo
            val photoX = cx - 200
            val photoY = cy - 200
            shaderCanvas.drawBitmap(scaledPhoto, photoX, photoY, shaderPaint)

            canvas.drawBitmap(shaderBitmap, 0f, 0f, null)
        } else {
             // Placeholder Heart
             val placePaint = Paint().apply { color = Color.WHITE; isAntiAlias = true }
             canvas.drawPath(heartPath, placePaint)
             val textP = Paint().apply { textSize = 80f; textAlign = Paint.Align.CENTER }
             canvas.drawText("❤️", cx, cy + 25, textP)
        }
        
        // 5. Text (Curved) to match new size
        val textPaint = Paint().apply {
            color = Color.BLACK
            textSize = 38f
            typeface = Typeface.create("cursive", Typeface.BOLD)
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }
        
        val textPath = Path()
        val arcRect = RectF(cx - 180, cy - 200, cx + 180, cy + 100)
        textPath.addArc(arcRect, 180f, 180f)
        canvas.drawTextOnPath(topText, textPath, 0f, -10f, textPaint)

        return bitmap
    }
}
