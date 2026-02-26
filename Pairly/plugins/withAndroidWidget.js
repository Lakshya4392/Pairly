const { withAndroidManifest, withMainApplication, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidWidget = (config) => {
    // 1. Add Receivers to AndroidManifest.xml
    config = withAndroidManifest(config, async (config) => {
        const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

        if (!mainApplication.receiver) {
            mainApplication.receiver = [];
        }

        // Main Widget
        mainApplication.receiver.push({
            $: {
                'android:name': '.widget.PairlyWidget',
                'android:exported': 'true',
                'android:label': 'Pairly Widget',
                'android:enabled': 'true',
            },
            'intent-filter': [
                {
                    $: {},
                    action: [
                        { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
                        { $: { 'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE' } },
                        { $: { 'android:name': 'com.pairly.app.widget.ACTION_REFRESH' } },
                        { $: { 'android:name': 'com.pairly.app.widget.ACTION_EXPIRE' } },
                    ],
                },
            ],
            'meta-data': [
                {
                    $: {
                        'android:name': 'android.appwidget.provider',
                        'android:resource': '@xml/pairly_widget_info',
                    },
                },
            ],
        });

        // Polaroid Widget
        mainApplication.receiver.push({
            $: {
                'android:name': '.widget.PairlyPolaroidWidget',
                'android:exported': 'true',
                'android:label': 'Pairly Polaroid',
                'android:enabled': 'true',
            },
            'intent-filter': [
                {
                    $: {},
                    action: [
                        { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
                        { $: { 'android:name': 'com.pairly.app.widget.POLAROID_REFRESH' } },
                        { $: { 'android:name': 'com.pairly.app.widget.POLAROID_REACT' } },
                        { $: { 'android:name': 'com.pairly.app.widget.POLAROID_EXPIRE' } },
                    ],
                },
            ],
            'meta-data': [
                {
                    $: {
                        'android:name': 'android.appwidget.provider',
                        'android:resource': '@xml/pairly_widget_polaroid_info',
                    },
                },
            ],
        });

        return config;
    });

    config = withMainApplication(config, async (config) => {
        const androidRoot = path.join(config.modRequest.platformProjectRoot, 'app/src/main');
        const resRoot = path.join(androidRoot, 'res');
        const javaRoot = path.join(androidRoot, 'java/com/pairly/app/widget');

        const sourceRoot = path.resolve(__dirname, 'widget/android/src/main');

        // Copy XML configs
        const targetXml = path.join(resRoot, 'xml');
        if (!fs.existsSync(targetXml)) fs.mkdirSync(targetXml, { recursive: true });
        
        ['pairly_widget_info.xml', 'pairly_widget_polaroid_info.xml'].forEach(file => {
            const src = path.join(sourceRoot, `res/xml/${file}`);
            if (fs.existsSync(src)) fs.copyFileSync(src, path.join(targetXml, file));
        });

        // Copy Drawables
        const targetDrawable = path.join(resRoot, 'drawable');
        if (!fs.existsSync(targetDrawable)) fs.mkdirSync(targetDrawable, { recursive: true });
        
        ['widget_background.xml', 'rounded_background.xml', 'widget_preview.xml', 'widget_card_rounded.xml'].forEach(file => {
            const src = path.join(sourceRoot, `res/drawable/${file}`);
            if (fs.existsSync(src)) fs.copyFileSync(src, path.join(targetDrawable, file));
        });
        
        // Copy non-dpi drawables (like polaroid placeholder)
        const targetDrawableNoDpi = path.join(resRoot, 'drawable-nodpi');
        if (!fs.existsSync(targetDrawableNoDpi)) fs.mkdirSync(targetDrawableNoDpi, { recursive: true });
        const placeholderSrc = path.join(sourceRoot, 'res/drawable-nodpi/widget_placeholder.png');
        if (fs.existsSync(placeholderSrc)) fs.copyFileSync(placeholderSrc, path.join(targetDrawableNoDpi, 'widget_placeholder.png'));

        // Copy Layouts
        const targetLayout = path.join(resRoot, 'layout');
        if (!fs.existsSync(targetLayout)) fs.mkdirSync(targetLayout, { recursive: true });
        
        ['pairly_widget_simple.xml', 'pairly_widget_polaroid.xml', 'pairly_widget.xml'].forEach(file => {
            const src = path.join(sourceRoot, `res/layout/${file}`);
            if (fs.existsSync(src)) fs.copyFileSync(src, path.join(targetLayout, file));
        });

        // Copy Kotlin Classes
        if (!fs.existsSync(javaRoot)) fs.mkdirSync(javaRoot, { recursive: true });
        
        ['PairlyWidget.kt', 'PairlyPolaroidWidget.kt', 'ReactionPickerActivity.kt', 'ReactionService.kt', 'WidgetTapReceiver.kt'].forEach(file => {
            const src = path.join(sourceRoot, `java/com/pairly/widget/${file}`);
            if (fs.existsSync(src)) fs.copyFileSync(src, path.join(javaRoot, file));
        });

        return config;
    });

    return config;
};

module.exports = withAndroidWidget;
