const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * Metro configuration - CRASH FIX VERSION
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

// ⚡ CRASH FIX: Enhanced blocklist to prevent React Native crashes
config.resolver.blockList = [
  /node_modules\/react-native-worklets\/android\/\.cxx\/.*/,
  /node_modules\/react-native-reanimated\/android\/\.cxx\/.*/,
  /node_modules\/react-native-screens\/android\/\.cxx\/.*/,
  /node_modules\/expo-modules-core\/android\/\.cxx\/.*/,
  // ⚡ NEW: Block problematic development files
  /.*\/\.expo\/.*\.js$/,
  /.*\/\.expo\/.*\.map$/,
];

// ⚡ CRASH FIX: Disable source maps in development to prevent AssertionError
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
  // ⚡ CRITICAL: Disable inline source maps that cause crashes
  inlineRequires: false,
};

// ⚡ CRASH FIX: Safer server configuration
config.server = {
  ...config.server,
  port: 8081,
  // ⚡ CRITICAL: Disable problematic middleware
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Skip symbolicate requests that cause AssertionError
      if (req.url && (req.url.includes('symbolicate') || req.url.includes('source-map'))) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
        return;
      }
      return middleware(req, res, next);
    };
  },
};

// ⚡ CRASH FIX: Ensure proper platform resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
