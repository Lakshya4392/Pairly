package com.pairly;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.view.View;
import android.widget.RemoteViews;
import com.pairly.app.MainActivity;
import com.pairly.app.R;
import java.io.File;

public class MinimalistCircleWidgetProvider extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, 
                                int appWidgetId, String photoPath, String partnerName, 
                                long timestamp) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), 
                                                R.layout.widget_minimalist_circle);

            if (photoPath != null && !photoPath.isEmpty()) {
                File imgFile = new File(photoPath);
                if (imgFile.exists()) {
                    Bitmap originalBitmap = BitmapFactory.decodeFile(imgFile.getAbsolutePath());
                    Bitmap circularBitmap = getCircularBitmap(originalBitmap);
                    views.setImageViewBitmap(R.id.widget_image, circularBitmap);
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
                views.setTextViewText(R.id.widget_partner_name, partnerName);
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

    private static Bitmap getCircularBitmap(Bitmap bitmap) {
        int size = Math.min(bitmap.getWidth(), bitmap.getHeight());
        Bitmap output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        Paint paint = new Paint();
        paint.setAntiAlias(true);
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        
        Rect rect = new Rect(0, 0, size, size);
        canvas.drawBitmap(bitmap, null, rect, paint);
        
        return output;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, null, "Partner", 0);
        }
    }
}
