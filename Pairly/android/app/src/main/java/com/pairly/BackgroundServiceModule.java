package com.pairly;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class BackgroundServiceModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    BackgroundServiceModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "BackgroundServiceModule";
    }

    @ReactMethod
    public void startService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, WidgetUpdateService.class);
            reactContext.startService(serviceIntent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, WidgetUpdateService.class);
            reactContext.stopService(serviceIntent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void isServiceRunning(Promise promise) {
        try {
            ActivityManager manager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
                if (WidgetUpdateService.class.getName().equals(service.service.getClassName())) {
                    promise.resolve(true);
                    return;
                }
            }
            promise.resolve(false);
        } catch (Exception e) {
            promise.reject(e);
        }
    }
}
