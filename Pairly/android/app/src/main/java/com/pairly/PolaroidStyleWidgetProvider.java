package com.pairly;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.view.View;
import android.widget.RemoteViews;
import com.pairly.app.MainActivity;
import com.pairly.app.R;
import java.io.File;

public class PolaroidStyleWidgetProvider extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, 
                                int appWidgetId, String photoPath, String partnerName, 
                                long timestamp) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), 
                                                R.layout.widget_polaroid_style);

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
                views.setTextViewText(R.id.widget_partner_name, partnerName + " ❤️");
            }

            if (timestamp > 0) {
                views.setTextViewText(R.id.widget_timestamp, getTimeAgo(timestamp));
            }

            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, null, "Partner", 0);
        }
    }

    private static String getTimeAgo(long timestamp) {
        long diff = System.currentTimeMillis() - timestamp;
        long minutes = diff / (60 * 1000);
        long hours = diff / (60 * 60 * 1000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + "m ago";
        if (hours < 24) return hours + "h ago";
        return "Recently";
    }
}
