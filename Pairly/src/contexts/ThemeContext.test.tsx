// Test to verify ThemeContext exports colors properly
import { colors as lightColors } from '../theme/colorsIOS';
import { darkColors } from '../services/ThemeService';

console.log('🧪 Testing Theme Colors...');
console.log('Light Colors Keys:', Object.keys(lightColors).length);
console.log('Dark Colors Keys:', Object.keys(darkColors).length);
console.log('Light has primary:', 'primary' in lightColors);
console.log('Dark has primary:', 'primary' in darkColors);
console.log('Light has background:', 'background' in lightColors);
console.log('Dark has background:', 'background' in darkColors);

// Check if all light color keys exist in dark colors
const lightKeys = Object.keys(lightColors);
const darkKeys = Object.keys(darkColors);
const missingInDark = lightKeys.filter(key => !darkKeys.includes(key));

if (missingInDark.length > 0) {
  console.error('❌ Missing in darkColors:', missingInDark);
} else {
  console.log('✅ All light color keys exist in dark colors');
}

export {};
