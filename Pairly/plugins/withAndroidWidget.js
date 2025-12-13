const { withAndroidManifest, withAndroidAppBuildGradle, withProjectBuildGradle, AndroidConfig, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const { Manifest, MainActivity } = AndroidConfig;

const withAndroidWidget = (config) => {
    // 1. Add Receiver to AndroidManifest.xml
    config = withAndroidManifest(config, async (config) => {
        const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

        // Add receiver for widget
        if (!mainApplication.receiver) {
            mainApplication.receiver = [];
        }

        mainApplication.receiver.push({
            $: {
                'android:name': '.widget.PairlyWidget',
                'android:exported': 'true',
                'android:label': 'Pairly Widget',
            },
            'intent-filter': [
                {
                    $: {},
                    action: [
                        { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
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

        return config;
    });

    // 2. Copy Resource Files (Layouts, XMLs, Java)
    // We use a dangerous mod to copy files because standard plugins don't easy copy arbitrary files
    config = withMainApplication(config, async (config) => {
        // Determine target paths
        const androidRoot = path.join(config.modRequest.platformProjectRoot, 'app/src/main');
        const resRoot = path.join(androidRoot, 'res');
        const javaRoot = path.join(androidRoot, 'java/com/pairly/app/widget');

        // Source paths (from our local plugins folder)
        const sourceRoot = path.resolve(__dirname, 'widget/android/src/main');

        // Copy XML config
        const targetXml = path.join(resRoot, 'xml');
        if (!fs.existsSync(targetXml)) fs.mkdirSync(targetXml, { recursive: true });
        fs.copyFileSync(
            path.join(sourceRoot, 'res/xml/pairly_widget_info.xml'),
            path.join(targetXml, 'pairly_widget_info.xml')
        );

        // Copy Drawables
        const targetDrawable = path.join(resRoot, 'drawable');
        if (!fs.existsSync(targetDrawable)) fs.mkdirSync(targetDrawable, { recursive: true });

        ['widget_background.xml', 'widget_placeholder.xml', 'rounded_background.xml', 'widget_preview.xml'].forEach(file => {
            fs.copyFileSync(
                path.join(sourceRoot, `res/drawable/${file}`),
                path.join(targetDrawable, file)
            );
        });

        // Copy Layout
        const targetLayout = path.join(resRoot, 'layout');
        if (!fs.existsSync(targetLayout)) fs.mkdirSync(targetLayout, { recursive: true });
        fs.copyFileSync(
            path.join(sourceRoot, 'res/layout/pairly_widget.xml'),
            path.join(targetLayout, 'pairly_widget.xml')
        );

        // Copy Kotlin Class
        if (!fs.existsSync(javaRoot)) fs.mkdirSync(javaRoot, { recursive: true });
        fs.copyFileSync(
            path.join(sourceRoot, 'java/com/pairly/widget/PairlyWidget.kt'),
            path.join(javaRoot, 'PairlyWidget.kt')
        );

        return config;
    });

    return config;
};

module.exports = withAndroidWidget;
