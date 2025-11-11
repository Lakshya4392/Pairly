/**
 * Font Download Helper
 * Downloads Inter fonts from Google Fonts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, 'assets', 'fonts');

// Inter font URLs (from Google Fonts CDN)
const FONT_URLS = {
  'Inter-Regular.ttf': 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf',
  'Inter-Medium.ttf': 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Medium.ttf',
  'Inter-SemiBold.ttf': 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.ttf',
  'Inter-Bold.ttf': 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.ttf',
};

// Create fonts directory if it doesn't exist
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  console.log('✅ Created fonts directory');
}

// Download a single font file
function downloadFont(filename, url) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(FONTS_DIR, filename);
    
    // Check if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${filename} already exists, skipping...`);
      resolve();
      return;
    }

    console.log(`📥 Downloading ${filename}...`);
    
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          
          file.on('finish', () => {
            file.close();
            console.log(`✅ Downloaded ${filename}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
      } else {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded ${filename}`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Download all fonts
async function downloadAllFonts() {
  console.log('🎨 Downloading Inter fonts...\n');
  
  try {
    for (const [filename, url] of Object.entries(FONT_URLS)) {
      await downloadFont(filename, url);
    }
    
    console.log('\n✅ All fonts downloaded successfully!');
    console.log('📁 Location:', FONTS_DIR);
    console.log('\n🚀 Next steps:');
    console.log('   1. Restart Expo: npx expo start --clear');
    console.log('   2. Test the app with new fonts!');
    
  } catch (error) {
    console.error('\n❌ Error downloading fonts:', error.message);
    console.log('\n💡 Alternative: Download manually from:');
    console.log('   https://fonts.google.com/specimen/Inter');
    process.exit(1);
  }
}

// Run the download
downloadAllFonts();
