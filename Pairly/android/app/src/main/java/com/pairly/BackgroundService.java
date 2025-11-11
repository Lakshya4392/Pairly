package com.pairly;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Background Service for Widget Updates
 * Keeps widget updated even when app is closed
 */
public class BackgroundService extends Service {
    
    private static final String TAG = "PairlyBgService";
    private static final String CHANNEL_ID = "pairly_widget_channel";
    private static final int NOTIFICATION_ID = 1001;
    private static final long UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes
    
    private Handler handler;
    private Runnable updateRunnable;
    private boolean isRunning = false;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Background service created");
        
        createNotificationChannel();
        handler = new Handler(Looper.getMainLooper());
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Background service started");
        
        if (!isRunning) {
            startForeground(NOTIFICATION_ID, createNotification());
            startWidgetUpdates();
            isRunning = true;
        }
        
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Background service destroyed");
        
        stopWidgetUpdates();
        isRunning = false;
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    /**
     * Create notification channel for Android O+
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Pairly Widget Updates",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps your widget updated with latest moments");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    /**
     * Create foreground service notification
     */
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pairly")
            .setContentText("Keeping your widget updated")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
    
    /**
     * Start periodic widget updates
     */
    private void startWidgetUpdates() {
        updateRunnable = new Runnable() {
            @Override
            public void run() {
                try {
                    // Trigger widget update
                    Log.d(TAG, "Triggering widget update");
                    
                    Intent updateIntent = new Intent(BackgroundService.this, PairlyWidgetProvider.class);
                    updateIntent.setAction(PairlyWidgetProvider.ACTION_UPDATE_WIDGET);
                    sendBroadcast(updateIntent);
                    
                } catch (Exception e) {
                    Log.e(TAG, "Error updating widget", e);
                }
                
                // Schedule next update
                handler.postDelayed(this, UPDATE_INTERVAL);
            }
        };
        
        // Start updates
        handler.post(updateRunnable);
    }
    
    /**
     * Stop widget updates
     */
    private void stopWidgetUpdates() {
        if (handler != null && updateRunnable != null) {
            handler.removeCallbacks(updateRunnable);
        }
    }
    
    /**
     * Start the background service
     */
    public static void start(Context context) {
        Intent intent = new Intent(context, BackgroundService.class);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
        
        Log.d(TAG, "Background service start requested");
    }
    
    /**
     * Stop the background service
     */
    public static void stop(Context context) {
        Intent intent = new Intent(context, BackgroundService.class);
        context.stopService(intent);
        
        Log.d(TAG, "Background service stop requested");
    }
}
