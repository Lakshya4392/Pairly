package com.pairly;

import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * React Native Module for Background Service Control
 */
public class BackgroundServiceModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "BackgroundServiceModule";
    private final ReactApplicationContext reactContext;
    
    public BackgroundServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @Override
    public String getName() {
        return "BackgroundServiceModule";
    }
    
    /**
     * Start background service
     */
    @ReactMethod
    public void startService(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            BackgroundService.start(context);
            
            Log.d(TAG, "Background service started");
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error starting background service", e);
            promise.reject("START_ERROR", e.getMessage());
        }
    }
    
    /**
     * Stop background service
     */
    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            BackgroundService.stop(context);
            
            Log.d(TAG, "Background service stopped");
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error stopping background service", e);
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }
    
    /**
     * Check if service is running
     */
    @ReactMethod
    public void isServiceRunning(Promise promise) {
        try {
            // Simple check - in production, you'd check actual service status
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CHECK_ERROR", e.getMessage());
        }
    }
}
