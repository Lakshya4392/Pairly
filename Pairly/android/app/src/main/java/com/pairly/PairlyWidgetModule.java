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
            
            // Check all widget types
            int totalWidgets = 0;
            totalWidgets += appWidgetManager.getAppWidgetIds(new ComponentName(reactContext, ClassicPhotoWidgetProvider.class)).length;
            totalWidgets += appWidgetManager.getAppWidgetIds(new ComponentName(reactContext, MinimalistCircleWidgetProvider.class)).length;
            totalWidgets += appWidgetManager.getAppWidgetIds(new ComponentName(reactContext, PolaroidStyleWidgetProvider.class)).length;
            totalWidgets += appWidgetManager.getAppWidgetIds(new ComponentName(reactContext, HeartShapeWidgetProvider.class)).length;
            totalWidgets += appWidgetManager.getAppWidgetIds(new ComponentName(reactContext, DualMomentWidgetProvider.class)).length;
            totalWidgets += appWidgetManager.getAppWidgetIds(new ComponentName(reactContext, FlipCardWidgetProvider.class)).length;
            
            promise.resolve(totalWidgets > 0);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void updateWidget(String photoPath, String partnerName, double timestamp, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);

            // Save the data for later updates
            SharedPreferences.Editor prefs = context.getSharedPreferences(PREFS_NAME, 0).edit();
            prefs.putString(PREF_PHOTO_PATH, photoPath);
            prefs.putString(PREF_PARTNER_NAME, partnerName);
            prefs.putLong(PREF_TIMESTAMP, (long) timestamp);
            prefs.apply();

            long ts = (long) timestamp;

            // Update Classic Photo widgets
            int[] classicIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, ClassicPhotoWidgetProvider.class));
            for (int id : classicIds) {
                ClassicPhotoWidgetProvider.updateAppWidget(context, appWidgetManager, id, photoPath, partnerName, ts);
            }

            // Update Minimalist Circle widgets
            int[] circleIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, MinimalistCircleWidgetProvider.class));
            for (int id : circleIds) {
                MinimalistCircleWidgetProvider.updateAppWidget(context, appWidgetManager, id, photoPath, partnerName, ts);
            }

            // Update Polaroid widgets
            int[] polaroidIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, PolaroidStyleWidgetProvider.class));
            for (int id : polaroidIds) {
                PolaroidStyleWidgetProvider.updateAppWidget(context, appWidgetManager, id, photoPath, partnerName, ts);
            }

            // Update Heart Shape widgets
            int[] heartIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, HeartShapeWidgetProvider.class));
            for (int id : heartIds) {
                HeartShapeWidgetProvider.updateAppWidget(context, appWidgetManager, id, photoPath, partnerName, ts);
            }

            // Update Dual Moment widgets (needs both user and partner photos)
            int[] dualIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, DualMomentWidgetProvider.class));
            for (int id : dualIds) {
                DualMomentWidgetProvider.updateAppWidget(context, appWidgetManager, id, null, photoPath, "You", partnerName, ts);
            }

            // Update Flip Card widgets
            int[] flipIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, FlipCardWidgetProvider.class));
            for (int id : flipIds) {
                FlipCardWidgetProvider.updateAppWidget(context, appWidgetManager, id, photoPath, partnerName, null, ts);
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

            // Clear saved data
            SharedPreferences.Editor prefs = context.getSharedPreferences(PREFS_NAME, 0).edit();
            prefs.remove(PREF_PHOTO_PATH);
            prefs.remove(PREF_PARTNER_NAME);
            prefs.remove(PREF_TIMESTAMP);
            prefs.apply();

            // Clear all widget types
            int[] classicIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, ClassicPhotoWidgetProvider.class));
            for (int id : classicIds) {
                ClassicPhotoWidgetProvider.updateAppWidget(context, appWidgetManager, id, null, null, 0);
            }

            int[] circleIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, MinimalistCircleWidgetProvider.class));
            for (int id : circleIds) {
                MinimalistCircleWidgetProvider.updateAppWidget(context, appWidgetManager, id, null, null, 0);
            }

            int[] polaroidIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, PolaroidStyleWidgetProvider.class));
            for (int id : polaroidIds) {
                PolaroidStyleWidgetProvider.updateAppWidget(context, appWidgetManager, id, null, null, 0);
            }

            int[] heartIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, HeartShapeWidgetProvider.class));
            for (int id : heartIds) {
                HeartShapeWidgetProvider.updateAppWidget(context, appWidgetManager, id, null, null, 0);
            }

            int[] dualIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, DualMomentWidgetProvider.class));
            for (int id : dualIds) {
                DualMomentWidgetProvider.updateAppWidget(context, appWidgetManager, id, null, null, null, null, 0);
            }

            int[] flipIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, FlipCardWidgetProvider.class));
            for (int id : flipIds) {
                FlipCardWidgetProvider.updateAppWidget(context, appWidgetManager, id, null, null, null, 0);
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject(e);
        }
    }
}
