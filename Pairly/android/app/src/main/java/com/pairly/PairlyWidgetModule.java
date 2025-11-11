package com.pairly;

import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

/**
 * React Native module for widget communication
 */
public class PairlyWidgetModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "PairlyWidgetModule";
    private final ReactApplicationContext reactContext;
    
    public PairlyWidgetModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @Override
    public String getName() {
        return "PairlyWidget";
    }
    
    /**
     * Update widget with new photo from React Native
     */
    @ReactMethod
    public void updateWidget(String photoPath, String partnerName, double timestamp, Promise promise) {
        try {
            Log.d(TAG, "updateWidget called from RN - Photo: " + photoPath + ", Partner: " + partnerName);
            
            Context context = getReactApplicationContext();
            long timestampLong = (long) timestamp;
            
            // Update the widget
            PairlyWidgetProvider.updateWidgetFromRN(context, photoPath, partnerName, timestampLong);
            
            promise.resolve("Widget updated successfully");
            Log.d(TAG, "Widget update completed");
            
        } catch (Exception e) {
            Log.e(TAG, "Error updating widget: " + e.getMessage());
            promise.reject("WIDGET_UPDATE_ERROR", "Failed to update widget: " + e.getMessage());
        }
    }
    
    /**
     * Clear widget photo
     */
    @ReactMethod
    public void clearWidget(Promise promise) {
        try {
            Log.d(TAG, "clearWidget called from RN");
            
            Context context = getReactApplicationContext();
            
            // Clear widget by passing empty values
            PairlyWidgetProvider.updateWidgetFromRN(context, "", "Your Partner", 0);
            
            promise.resolve("Widget cleared successfully");
            Log.d(TAG, "Widget clear completed");
            
        } catch (Exception e) {
            Log.e(TAG, "Error clearing widget: " + e.getMessage());
            promise.reject("WIDGET_CLEAR_ERROR", "Failed to clear widget: " + e.getMessage());
        }
    }
    
    /**
     * Check if widgets are available
     */
    @ReactMethod
    public void hasWidgets(Promise promise) {
        try {
            // For now, always return true on Android
            // In future, we can check if any widgets are actually added
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Error checking widgets: " + e.getMessage());
            promise.reject("WIDGET_CHECK_ERROR", "Failed to check widgets: " + e.getMessage());
        }
    }
}