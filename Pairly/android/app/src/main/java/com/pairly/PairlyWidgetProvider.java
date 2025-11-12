package com.pairly;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import com.pairly.app.MainActivity; // Corrected import
import com.pairly.app.R; // Added import

import java.io.File;

public class PairlyWidgetProvider extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId, String photoPath, String partnerName, long timestamp) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.pairly_widget_layout);

            if (photoPath != null && !photoPath.isEmpty()) {
                File imgFile = new File(photoPath);
                if (imgFile.exists()) {
                    Bitmap myBitmap = BitmapFactory.decodeFile(imgFile.getAbsolutePath());
                    views.setImageViewBitmap(R.id.widget_image, myBitmap);
                    views.setTextViewText(R.id.widget_partner_name, partnerName);
                    views.setViewVisibility(R.id.widget_placeholder, View.GONE);
                    views.setViewVisibility(R.id.widget_image, View.VISIBLE);
                    views.setViewVisibility(R.id.widget_partner_name, View.VISIBLE);
                } else {
                    // Image file does not exist, show placeholder
                    views.setViewVisibility(R.id.widget_placeholder, View.VISIBLE);
                    views.setViewVisibility(R.id.widget_image, View.GONE);
                    views.setViewVisibility(R.id.widget_partner_name, View.GONE);
                }
            } else {
                // No photo path, show placeholder
                views.setViewVisibility(R.id.widget_placeholder, View.VISIBLE);
                views.setViewVisibility(R.id.widget_image, View.GONE);
                views.setViewVisibility(R.id.widget_partner_name, View.GONE);
            }

            // Make the widget clickable to open the app
            Intent intent = new Intent(context, com.pairly.app.MainActivity.class); // Corrected class reference
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            // By default, show placeholder. The widget will be updated from the app.
            updateAppWidget(context, appWidgetManager, appWidgetId, null, null, 0);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // Enter relevant functionality for when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}
