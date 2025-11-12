package com.pairly;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class PairlyWidgetModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;
    private static final String PREFS_NAME = "com.pairly.widget";
    private static final String PREF_PHOTO_PATH = "photo_path";
    private static final String PREF_PARTNER_NAME = "partner_name";
    private static final String PREF_TIMESTAMP = "timestamp";

    PairlyWidgetModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "PairlyWidget";
    }

    @ReactMethod
    public void hasWidgets(Promise promise) {
        try {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(reactContext);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(reactContext, PairlyWidgetProvider.class));
            promise.resolve(appWidgetIds.length > 0);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void updateWidget(String photoPath, String partnerName, double timestamp, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, PairlyWidgetProvider.class));

            // Save the data for later updates
            SharedPreferences.Editor prefs = context.getSharedPreferences(PREFS_NAME, 0).edit();
            prefs.putString(PREF_PHOTO_PATH, photoPath);
            prefs.putString(PREF_PARTNER_NAME, partnerName);
            prefs.putLong(PREF_TIMESTAMP, (long) timestamp);
            prefs.apply();

            for (int appWidgetId : appWidgetIds) {
                PairlyWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, photoPath, partnerName, (long) timestamp);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void clearWidget(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, PairlyWidgetProvider.class));

            // Clear saved data
            SharedPreferences.Editor prefs = context.getSharedPreferences(PREFS_NAME, 0).edit();
            prefs.remove(PREF_PHOTO_PATH);
            prefs.remove(PREF_PARTNER_NAME);
            prefs.remove(PREF_TIMESTAMP);
            prefs.apply();

            for (int appWidgetId : appWidgetIds) {
                PairlyWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, null, null, 0);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject(e);
        }
    }
}
