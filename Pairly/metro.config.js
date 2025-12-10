const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Add custom resolver for path aliases
config.resolver.alias = {
  '@components': path.resolve(__dirname, 'src/components'),
  '@screens': path.resolve(__dirname, 'src/screens'),
  '@services': path.resolve(__dirname, 'src/services'),
  '@types': path.resolve(__dirname, 'src/types'),
  '@theme': path.resolve(__dirname, 'src/theme'),
  '@utils': path.resolve(__dirname, 'src/utils'),
};

// ⚡ FIX: Exclude problematic native modules causing CMake issues
config.resolver.blockList = [
  /node_modules\/react-native-worklets\/android\/\.cxx\/.*/,
  /node_modules\/react-native-reanimated\/android\/\.cxx\/.*/,
  /node_modules\/react-native-screens\/android\/\.cxx\/.*/,
  /node_modules\/expo-modules-core\/android\/\.cxx\/.*/,
];

module.exports = config;
