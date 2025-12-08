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
                
                // Set click to open app
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
