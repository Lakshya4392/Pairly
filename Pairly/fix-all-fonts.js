const fs = require('fs');
const path = require('path');

// Find all .tsx files in src directory
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Fix font styles in a file
function fixFontsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if file already imports typography
  const hasTypographyImport = content.includes("from '../utils/fonts'") || 
                               content.includes('from \'../utils/fonts\'');
  
  // Patterns to replace
  const patterns = [
    // fontWeight: '700' or '800' or '900' -> use typography.h* or Inter-Bold
    { 
      regex: /fontSize:\s*(\d+),\s*fontWeight:\s*['"]7\d{2}['"]/g,
      replacement: (match, fontSize) => {
        if (fontSize >= 28) return '...typography.h2';
        if (fontSize >= 24) return '...typography.h3';
        if (fontSize >= 20) return '...typography.h4';
        return `fontFamily: 'Inter-Bold', fontSize: ${fontSize}`;
      }
    },
    // fontWeight: '600' -> Inter-SemiBold
    { 
      regex: /fontSize:\s*(\d+),\s*fontWeight:\s*['"]6\d{2}['"]/g,
      replacement: (match, fontSize) => `fontFamily: 'Inter-SemiBold', fontSize: ${fontSize}`
    },
    // fontWeight: '500' -> Inter-Medium
    { 
      regex: /fontSize:\s*(\d+),\s*fontWeight:\s*['"]5\d{2}['"]/g,
      replacement: (match, fontSize) => `fontFamily: 'Inter-Medium', fontSize: ${fontSize}`
    },
    // Just fontWeight without fontSize
    { 
      regex: /fontWeight:\s*['"]7\d{2}['"]/g,
      replacement: "fontFamily: 'Inter-Bold'"
    },
    { 
      regex: /fontWeight:\s*['"]6\d{2}['"]/g,
      replacement: "fontFamily: 'Inter-SemiBold'"
    },
    { 
      regex: /fontWeight:\s*['"]5\d{2}['"]/g,
      replacement: "fontFamily: 'Inter-Medium'"
    },
    { 
      regex: /fontWeight:\s*['"]4\d{2}['"]/g,
      replacement: "fontFamily: 'Inter-Regular'"
    },
  ];
  
  // Apply replacements
  patterns.forEach(({ regex, replacement }) => {
    if (content.match(regex)) {
      if (typeof replacement === 'function') {
        content = content.replace(regex, replacement);
      } else {
        content = content.replace(regex, replacement);
      }
      modified = true;
    }
  });
  
  // Add typography import if needed and modified
  if (modified && !hasTypographyImport && !filePath.includes('fonts.ts')) {
    // Find the last import statement
    const importRegex = /import\s+.*?from\s+['"].*?['"];?\n/g;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      
      // Calculate relative path to utils/fonts
      const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, 'src', 'utils')).replace(/\\/g, '/');
      const importStatement = `import { typography } from '${relativePath}/fonts';\n`;
      
      content = content.slice(0, lastImportIndex + lastImport.length) + 
                importStatement + 
                content.slice(lastImportIndex + lastImport.length);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Main execution
console.log('🔍 Finding all TypeScript files...\n');
const srcDir = path.join(__dirname, 'src');
const files = findTsxFiles(srcDir);

console.log(`📝 Found ${files.length} files\n`);
console.log('🔧 Fixing fonts...\n');

let fixedCount = 0;
files.forEach(file => {
  if (fixFontsInFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✨ Done! Fixed ${fixedCount} files`);
console.log('\n⚠️  Please review changes and restart Metro:');
console.log('   npx expo start --clear\n');
