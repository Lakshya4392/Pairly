/**
 * 🛠️ DEV TOOLS - For testing and debugging
 * Use these functions in console or add temporary buttons
 */

import MomentService from '../services/MomentService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DevTools = {
  /**
   * Clear all photos and data
   */
  async clearAllData() {
    try {
      console.log('🗑️ Clearing all data...');
      const success = await MomentService.clearAllData();
      
      if (success) {
        console.log('✅ All data cleared successfully!');
        console.log('🔄 Please reload the app');
        return true;
      } else {
        console.log('❌ Failed to clear data');
        return false;
      }
    } catch (error) {
      console.error('❌ Error:', error);
      return false;
    }
  },

  /**
   * Show current storage status
   */
  async showStatus() {
    try {
      const stats = await MomentService.getStorageStats();
      console.log('\n📊 ========== STORAGE STATUS ==========');
      console.log(`✅ Total Moments: ${stats.totalMoments}`);
      console.log(`   👤 My Moments: ${stats.myMoments}`);
      console.log(`   ❤️ Partner Moments: ${stats.partnerMoments}`);
      console.log(`💾 Storage: Metadata only (no photos stored locally)`);
      console.log('======================================\n');
      return stats;
    } catch (error) {
      console.error('❌ Error:', error);
      return null;
    }
  },

  /**
   * Reset migration flag (for testing)
   */
  async resetMigration() {
    await AsyncStorage.removeItem('@pairly_migration_done');
    console.log('✅ Migration flag reset');
  },
};

// Make it globally available in dev mode
if (__DEV__) {
  (global as any).DevTools = DevTools;
  console.log('🛠️ DevTools loaded! Use: DevTools.clearAllData()');
}

export default DevTools;
