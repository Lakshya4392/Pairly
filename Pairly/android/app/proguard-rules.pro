# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Pairly Widget - CRITICAL: prevent obfuscation of widget classes
-keep class com.pairly.app.widget.** { *; }
-keep class com.pairly.app.PairlyWidgetModule { *; }
-keep class com.pairly.app.PairlyWidgetPackage { *; }
-keep class com.pairly.app.SharedPrefsModule { *; }
-keep class com.pairly.app.SharedPrefsPackage { *; }

# Keep all AppWidgetProviders
-keep class * extends android.appwidget.AppWidgetProvider { *; }

# Keep RemoteViews related classes
-keep class android.widget.RemoteViews { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
