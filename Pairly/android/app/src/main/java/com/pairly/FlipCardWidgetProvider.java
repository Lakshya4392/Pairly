package com.pairly;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.view.View;
import android.widget.RemoteViews;
import com.pairly.app.MainActivity;
import com.pairly.app.R;

import java.io.File;

public class FlipCardWidgetProvider extends AppWidgetProvider {

    private static final String FLIP_ACTION = "com.pairly.FLIP_WIDGET";
    private static final String PREFS_NAME = "FlipCardWidgetPrefs";
    private static final String PREF_IS_FLIPPED = "is_flipped_";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        if (FLIP_ACTION.equals(intent.getAction())) {
            int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, 
                                                 AppWidgetManager.INVALID_APPWIDGET_ID);
            
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                // Toggle flip state
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                boolean isFlipped = prefs.getBoolean(PREF_IS_FLIPPED + appWidgetId, false);
                prefs.edit().putBoolean(PREF_IS_FLIPPED + appWidgetId, !isFlipped).apply();
                
                // Update widget with animation
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                updateAppWidget(context, appWidgetManager, appWidgetId);
            }
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, 
                                int appWidgetId) {
        updateAppWidget(context, appWidgetManager, appWidgetId, null, null, null, 0);
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, 
                                int appWidgetId, String photoPath, String partnerName, 
                                String note, long timestamp) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isFlipped = prefs.getBoolean(PREF_IS_FLIPPED + appWidgetId, false);

            RemoteViews views;
            
            if (isFlipped) {
                // Show BACK side (Note)
                views = new RemoteViews(context.getPackageName(), R.layout.widget_flip_card_back);
                
                if (note != null && !note.isEmpty()) {
                    views.setTextViewText(R.id.widget_note, note);
                } else {
                    views.setTextViewText(R.id.widget_note, 
                        "No note yet\n\nYour partner hasn't sent a message 💕");
                }
                
                if (partnerName != null && !partnerName.isEmpty()) {
                    views.setTextViewText(R.id.widget_partner_name, partnerName);
                }
            } else {
                // Show FRONT side (Photo)
                views = new RemoteViews(context.getPackageName(), R.layout.widget_flip_card_front);
                
                if (photoPath != null && !photoPath.isEmpty()) {
                    File imgFile = new File(photoPath);
                    if (imgFile.exists()) {
                        Bitmap myBitmap = BitmapFactory.decodeFile(imgFile.getAbsolutePath());
                        views.setImageViewBitmap(R.id.widget_image, myBitmap);
                        views.setViewVisibility(R.id.widget_placeholder, View.GONE);
                        views.setViewVisibility(R.id.widget_image, View.VISIBLE);
                    } else {
                        views.setViewVisibility(R.id.widget_placeholder, View.VISIBLE);
                        views.setViewVisibility(R.id.widget_image, View.GONE);
                    }
                } else {
                    views.setViewVisibility(R.id.widget_placeholder, View.VISIBLE);
                    views.setViewVisibility(R.id.widget_image, View.GONE);
                }
                
                if (partnerName != null && !partnerName.isEmpty()) {
                    views.setTextViewText(R.id.widget_partner_name, partnerName);
                }
            }

            // Set up flip action
            Intent flipIntent = new Intent(context, FlipCardWidgetProvider.class);
            flipIntent.setAction(FLIP_ACTION);
            flipIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            PendingIntent flipPendingIntent = PendingIntent.getBroadcast(
                context, appWidgetId, flipIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, flipPendingIntent);

            // Update widget
            appWidgetManager.updateAppWidget(appWidgetId, views);
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        // Clean up preferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        for (int appWidgetId : appWidgetIds) {
            editor.remove(PREF_IS_FLIPPED + appWidgetId);
        }
        editor.apply();
    }
}
