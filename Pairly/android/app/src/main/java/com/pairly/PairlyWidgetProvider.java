package com.pairly;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Pairly Widget Provider - Shows partner's latest photo on home screen
 */
public class PairlyWidgetProvider extends AppWidgetProvider {
    
    private static final String TAG = "PairlyWidget";
    private static final String PREFS_NAME = "PairlyWidgetPrefs";
    private static final String PREF_PHOTO_PATH = "photo_path_";
    private static final String PREF_PARTNER_NAME = "partner_name_";
    private static final String PREF_PHOTO_TIMESTAMP = "photo_timestamp_";
    private static final String PREF_WIDGET_SIZE = "widget_size_";
    
    // Widget Actions
    private static final String ACTION_WIDGET_CLICK = "com.pairly.WIDGET_CLICK";
    private static final String ACTION_CAMERA_CLICK = "com.pairly.CAMERA_CLICK";
    public static final String ACTION_UPDATE_WIDGET = "com.pairly.UPDATE_WIDGET";
    
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate called for " + appWidgetIds.length + " widgets");
        
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }
    
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        String action = intent.getAction();
        Log.d(TAG, "onReceive: " + action);
        
        if (ACTION_WIDGET_CLICK.equals(action)) {
            // Open main app
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(launchIntent);
            }
        } else if (ACTION_CAMERA_CLICK.equals(action)) {
            // Open app to camera screen
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                launchIntent.putExtra("openCamera", true);
                context.startActivity(launchIntent);
            }
        } else if (ACTION_UPDATE_WIDGET.equals(action)) {
            // Update all widgets
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName componentName = new ComponentName(context, PairlyWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }
    
    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, 
                                        int appWidgetId, Bundle newOptions) {
        Log.d(TAG, "onAppWidgetOptionsChanged for widget " + appWidgetId);
        updateAppWidget(context, appWidgetManager, appWidgetId);
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
    }
    
    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        Log.d(TAG, "onDeleted for " + appWidgetIds.length + " widgets");
        
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        
        for (int appWidgetId : appWidgetIds) {
            // Clean up preferences for deleted widgets
            editor.remove(PREF_PHOTO_PATH + appWidgetId);
            editor.remove(PREF_PARTNER_NAME + appWidgetId);
            editor.remove(PREF_PHOTO_TIMESTAMP + appWidgetId);
            editor.remove(PREF_WIDGET_SIZE + appWidgetId);
        }
        
        editor.apply();
        super.onDeleted(context, appWidgetIds);
    }
    
    /**
     * Update a single widget
     */
    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.d(TAG, "Updating widget " + appWidgetId);
        
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.pairly_widget_layout);
        
        // Get widget preferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String photoPath = prefs.getString(PREF_PHOTO_PATH + appWidgetId, null);
        String partnerName = prefs.getString(PREF_PARTNER_NAME + appWidgetId, "Your Partner");
        long photoTimestamp = prefs.getLong(PREF_PHOTO_TIMESTAMP + appWidgetId, 0);
        String widgetSize = prefs.getString(PREF_WIDGET_SIZE + appWidgetId, "medium");
        
        // Set up click intents
        setupClickIntents(context, views, appWidgetId);
        
        // Load and display photo
        if (photoPath != null && !photoPath.isEmpty()) {
            Bitmap photoBitmap = loadPhotoFromPath(photoPath);
            if (photoBitmap != null) {
                views.setImageViewBitmap(R.id.partner_photo, photoBitmap);
                views.setViewVisibility(R.id.partner_photo, View.VISIBLE);
                views.setViewVisibility(R.id.no_photo_placeholder, View.GONE);
                views.setViewVisibility(R.id.loading_overlay, View.GONE);
            } else {
                showNoPhotoState(views);
            }
        } else {
            showNoPhotoState(views);
        }
        
        // Update partner info
        views.setTextViewText(R.id.partner_name, partnerName);
        
        // Update timestamp
        String timeAgo = getTimeAgo(context, photoTimestamp);
        views.setTextViewText(R.id.time_ago, timeAgo);
        
        // Adjust layout based on widget size
        adjustLayoutForSize(views, widgetSize);
        
        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
        
        Log.d(TAG, "Widget " + appWidgetId + " updated successfully");
    }
    
    /**
     * Set up click intents for widget elements
     */
    private static void setupClickIntents(Context context, RemoteViews views, int appWidgetId) {
        // Main widget click - open app
        Intent widgetIntent = new Intent(context, PairlyWidgetProvider.class);
        widgetIntent.setAction(ACTION_WIDGET_CLICK);
        PendingIntent widgetPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, widgetIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.partner_photo, widgetPendingIntent);
        
        // Camera button click - open camera
        Intent cameraIntent = new Intent(context, PairlyWidgetProvider.class);
        cameraIntent.setAction(ACTION_CAMERA_CLICK);
        PendingIntent cameraPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId + 1000, cameraIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.action_button, cameraPendingIntent);
    }
    
    /**
     * Show no photo placeholder state
     */
    private static void showNoPhotoState(RemoteViews views) {
        views.setViewVisibility(R.id.partner_photo, View.GONE);
        views.setViewVisibility(R.id.no_photo_placeholder, View.VISIBLE);
        views.setViewVisibility(R.id.loading_overlay, View.GONE);
        views.setViewVisibility(R.id.heart_reaction, View.GONE);
    }
    
    /**
     * Load photo from file path
     */
    private static Bitmap loadPhotoFromPath(String photoPath) {
        try {
            File photoFile = new File(photoPath);
            if (photoFile.exists()) {
                FileInputStream fis = new FileInputStream(photoFile);
                Bitmap bitmap = BitmapFactory.decodeStream(fis);
                fis.close();
                
                // Scale bitmap if too large
                if (bitmap != null) {
                    int maxSize = 512; // Max size for widget
                    if (bitmap.getWidth() > maxSize || bitmap.getHeight() > maxSize) {
                        float scale = Math.min(
                            (float) maxSize / bitmap.getWidth(),
                            (float) maxSize / bitmap.getHeight()
                        );
                        int newWidth = Math.round(bitmap.getWidth() * scale);
                        int newHeight = Math.round(bitmap.getHeight() * scale);
                        bitmap = Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true);
                    }
                }
                
                return bitmap;
            }
        } catch (IOException e) {
            Log.e(TAG, "Error loading photo: " + e.getMessage());
        }
        return null;
    }
    
    /**
     * Get human-readable time ago string
     */
    private static String getTimeAgo(Context context, long timestamp) {
        if (timestamp == 0) {
            return context.getString(R.string.widget_no_photo);
        }
        
        long now = System.currentTimeMillis();
        long diff = now - timestamp;
        
        if (diff < 60000) { // Less than 1 minute
            return context.getString(R.string.widget_just_now);
        } else if (diff < 3600000) { // Less than 1 hour
            int minutes = (int) (diff / 60000);
            return context.getString(R.string.widget_minutes_ago, minutes);
        } else if (diff < 86400000) { // Less than 1 day
            int hours = (int) (diff / 3600000);
            return context.getString(R.string.widget_hours_ago, hours);
        } else {
            int days = (int) (diff / 86400000);
            return context.getString(R.string.widget_days_ago, days);
        }
    }
    
    /**
     * Adjust layout based on widget size
     */
    private static void adjustLayoutForSize(RemoteViews views, String size) {
        switch (size) {
            case "small":
                // Hide info section for small widgets
                views.setViewVisibility(R.id.bottom_info, View.GONE);
                break;
            case "large":
                // Show all elements for large widgets
                views.setViewVisibility(R.id.bottom_info, View.VISIBLE);
                views.setViewVisibility(R.id.heart_reaction, View.VISIBLE);
                break;
            case "medium":
            default:
                // Default medium size
                views.setViewVisibility(R.id.bottom_info, View.VISIBLE);
                views.setViewVisibility(R.id.heart_reaction, View.GONE);
                break;
        }
    }
    
    /**
     * Public method to update widget from React Native
     */
    public static void updateWidgetFromRN(Context context, String photoPath, String partnerName, long timestamp) {
        Log.d(TAG, "updateWidgetFromRN called");
        
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, PairlyWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        
        if (appWidgetIds.length > 0) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            // Update all widgets with new photo
            for (int appWidgetId : appWidgetIds) {
                editor.putString(PREF_PHOTO_PATH + appWidgetId, photoPath);
                editor.putString(PREF_PARTNER_NAME + appWidgetId, partnerName);
                editor.putLong(PREF_PHOTO_TIMESTAMP + appWidgetId, timestamp);
            }
            
            editor.apply();
            
            // Trigger widget updates
            Intent updateIntent = new Intent(context, PairlyWidgetProvider.class);
            updateIntent.setAction(ACTION_UPDATE_WIDGET);
            context.sendBroadcast(updateIntent);
            
            Log.d(TAG, "Updated " + appWidgetIds.length + " widgets");
        }
    }
}