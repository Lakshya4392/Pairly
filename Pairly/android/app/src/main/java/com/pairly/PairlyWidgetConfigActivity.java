package com.pairly;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Spinner;

/**
 * Widget Configuration Activity
 */
public class PairlyWidgetConfigActivity extends Activity {
    
    private static final String TAG = "PairlyWidgetConfig";
    private static final String PREFS_NAME = "PairlyWidgetPrefs";
    private static final String PREF_WIDGET_SIZE = "widget_size_";
    private static final String PREF_UPDATE_FREQUENCY = "update_frequency_";
    
    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    private RadioGroup sizeOptions;
    private Spinner updateFrequency;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.pairly_widget_config);
        
        Log.d(TAG, "Widget configuration activity started");
        
        // Set the result to CANCELED initially
        setResult(RESULT_CANCELED);
        
        // Get the widget ID from the intent
        Intent intent = getIntent();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }
        
        // If this activity was started with an intent without an app widget ID, finish with an error
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            Log.e(TAG, "Invalid widget ID");
            finish();
            return;
        }
        
        initializeViews();
        setupUpdateFrequencySpinner();
        setupButtons();
    }
    
    private void initializeViews() {
        sizeOptions = findViewById(R.id.size_options);
        updateFrequency = findViewById(R.id.update_frequency);
    }
    
    private void setupUpdateFrequencySpinner() {
        String[] frequencies = {
            getString(R.string.widget_update_realtime),
            getString(R.string.widget_update_5min),
            getString(R.string.widget_update_15min),
            getString(R.string.widget_update_30min),
            getString(R.string.widget_update_1hour)
        };
        
        ArrayAdapter<String> adapter = new ArrayAdapter<>(
            this,
            android.R.layout.simple_spinner_item,
            frequencies
        );
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        updateFrequency.setAdapter(adapter);
        updateFrequency.setSelection(1); // Default to 5 minutes
    }
    
    private void setupButtons() {
        Button cancelButton = findViewById(R.id.cancel_button);
        Button addWidgetButton = findViewById(R.id.add_widget_button);
        
        cancelButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Log.d(TAG, "Widget configuration cancelled");
                finish();
            }
        });
        
        addWidgetButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                saveWidgetConfiguration();
                createWidget();
            }
        });
    }
    
    private void saveWidgetConfiguration() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        
        // Save widget size
        String selectedSize = getSelectedSize();
        editor.putString(PREF_WIDGET_SIZE + appWidgetId, selectedSize);
        
        // Save update frequency
        int frequencyIndex = updateFrequency.getSelectedItemPosition();
        editor.putInt(PREF_UPDATE_FREQUENCY + appWidgetId, frequencyIndex);
        
        editor.apply();
        
        Log.d(TAG, "Widget configuration saved - Size: " + selectedSize + ", Frequency: " + frequencyIndex);
    }
    
    private String getSelectedSize() {
        int selectedId = sizeOptions.getCheckedRadioButtonId();
        
        if (selectedId == R.id.size_small) {
            return "small";
        } else if (selectedId == R.id.size_large) {
            return "large";
        } else {
            return "medium"; // Default
        }
    }
    
    private void createWidget() {
        Log.d(TAG, "Creating widget " + appWidgetId);
        
        // Update the widget
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        PairlyWidgetProvider.updateAppWidget(this, appWidgetManager, appWidgetId);
        
        // Return success result
        Intent resultValue = new Intent();
        resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        setResult(RESULT_OK, resultValue);
        
        Log.d(TAG, "Widget created successfully");
        finish();
    }
}