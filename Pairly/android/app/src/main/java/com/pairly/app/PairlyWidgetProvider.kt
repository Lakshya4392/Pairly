package com.pairly.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.widget.RemoteViews
import java.io.File

class PairlyWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = android.content.ComponentName(context, PairlyWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            
            for (widgetId in widgetIds) {
                updateAppWidget(context, appWidgetManager, widgetId)
            }
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)
        
        // Get saved widget data
        val prefs = context.getSharedPreferences("pairly_widget", Context.MODE_PRIVATE)
        val photoPath = prefs.getString("photoPath", null)
        val partnerName = prefs.getString("partnerName", "Your Partner")
        
        // Set partner name
        views.setTextViewText(R.id.widget_partner_name, partnerName)
        
        // Load and set photo
        if (photoPath != null) {
            val photoFile = File(photoPath)
            if (photoFile.exists()) {
                try {
                    val bitmap = BitmapFactory.decodeFile(photoPath)
                    if (bitmap != null) {
                        views.setImageViewBitmap(R.id.widget_photo, bitmap)
                    } else {
                        views.setImageViewResource(R.id.widget_photo, R.drawable.widget_placeholder)
                    }
                } catch (e: Exception) {
                    views.setImageViewResource(R.id.widget_photo, R.drawable.widget_placeholder)
                }
            } else {
                views.setImageViewResource(R.id.widget_photo, R.drawable.widget_placeholder)
            }
        } else {
            views.setImageViewResource(R.id.widget_photo, R.drawable.widget_placeholder)
        }
        
        // Set click intent to open app
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
