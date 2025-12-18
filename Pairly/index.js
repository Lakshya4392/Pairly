import messaging from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
import { WidgetUpdateService } from './src/services/WidgetUpdateService';

import App from './App';

// 🔥 FIX: Register background handler at ROOT level
// This allows handling messages even when app is KILLED
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('💀 [Background/Killed] Message handled:', remoteMessage.messageId);

    // Handle Widget Update logic
    // If payload contains photoUrl, download and update widget
    if (remoteMessage.data && remoteMessage.data.type === 'new_moment') {
        const { photoUrl, partnerName } = remoteMessage.data;

        if (photoUrl) {
            console.log('💀 [Background] New moment detected, updating widget...');
            await WidgetUpdateService.updateWidgetWithPhoto(photoUrl, partnerName);
        }
    }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

