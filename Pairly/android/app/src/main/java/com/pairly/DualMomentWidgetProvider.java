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

public class DualMomentWidgetProvider extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, 
                                int appWidgetId, String userPhotoPath, String partnerPhotoPath,
                                String userName, String partnerName, long timestamp) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), 
                                                R.layout.widget_dual_moment);

            // Update user photo
            if (userPhotoPath != null && !userPhotoPath.isEmpty()) {
                File imgFile = new File(userPhotoPath);
                if (imgFile.exists()) {
                    Bitmap myBitmap = BitmapFactory.decodeFile(imgFile.getAbsolutePath());
                    views.setImageViewBitmap(R.id.widget_image_user, myBitmap);
                    views.setViewVisibility(R.id.widget_placeholder_user, View.GONE);
                    views.setViewVisibility(R.id.widget_image_user, View.VISIBLE);
                } else {
                    views.setViewVisibility(R.id.widget_placeholder_user, View.VISIBLE);
                    views.setViewVisibility(R.id.widget_image_user, View.GONE);
                }
            } else {
                views.setViewVisibility(R.id.widget_placeholder_user, View.VISIBLE);
                views.setViewVisibility(R.id.widget_image_user, View.GONE);
            }

            // Update partner photo
            if (partnerPhotoPath != null && !partnerPhotoPath.isEmpty()) {
                File imgFile = new File(partnerPhotoPath);
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

            // Update names
            if (userName != null && !userName.isEmpty()) {
                views.setTextViewText(R.id.widget_user_name, userName);
            }
            
            if (partnerName != null && !partnerName.isEmpty()) {
                views.setTextViewText(R.id.widget_partner_name, partnerName);
            }

            if (timestamp > 0) {
                views.setTextViewText(R.id.widget_timestamp, "Shared " + getTimeAgo(timestamp));
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
            updateAppWidget(context, appWidgetManager, appWidgetId, null, null, 
                          "You", "Partner", 0);
        }
    }

    private static String getTimeAgo(long timestamp) {
        long diff = System.currentTimeMillis() - timestamp;
        long hours = diff / (60 * 60 * 1000);
        if (hours < 1) return "just now";
        if (hours < 24) return hours + "h ago";
        return "today";
    }
}
