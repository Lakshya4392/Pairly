const fs = require('fs');
const path = require('path');

// Find all .tsx files
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

// Fix spread operator usage
function fixSpreadOperator(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remove typography import if exists
  if (content.includes("from '../utils/fonts'") || content.includes("from '../../utils/fonts'")) {
    content = content.replace(/import\s+{\s*typography\s*}\s+from\s+['"]\.\.\/\.\.?\/utils\/fonts['"];\n?/g, '');
    modified = true;
  }
  
  // Replace ...typography.* with actual values
  const replacements = [
    { pattern: /\.\.\.typography\.h1/g, value: "fontFamily: 'Inter-Bold', fontSize: 32, lineHeight: 40" },
    { pattern: /\.\.\.typography\.h2/g, value: "fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36" },
    { pattern: /\.\.\.typography\.h3/g, value: "fontFamily: 'Inter-SemiBold', fontSize: 24, lineHeight: 32" },
    { pattern: /\.\.\.typography\.h4/g, value: "fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 28" },
    { pattern: /\.\.\.typography\.button/g, value: "fontFamily: 'Inter-SemiBold', fontSize: 16, lineHeight: 24" },
    { pattern: /\.\.\.typography\.body/g, value: "fontFamily: 'Inter-Regular', fontSize: 16, lineHeight: 24" },
    { pattern: /\.\.\.typography\.bodyMedium/g, value: "fontFamily: 'Inter-Medium', fontSize: 16, lineHeight: 24" },
    { pattern: /\.\.\.typography\.bodySemiBold/g, value: "fontFamily: 'Inter-SemiBold', fontSize: 16, lineHeight: 24" },
    { pattern: /\.\.\.typography\.small/g, value: "fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20" },
    { pattern: /\.\.\.typography\.smallMedium/g, value: "fontFamily: 'Inter-Medium', fontSize: 14, lineHeight: 20" },
    { pattern: /\.\.\.typography\.caption/g, value: "fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 16" },
    { pattern: /\.\.\.typography\.captionMedium/g, value: "fontFamily: 'Inter-Medium', fontSize: 12, lineHeight: 16" },
  ];
  
  replacements.forEach(({ pattern, value }) => {
    if (content.match(pattern)) {
      content = content.replace(pattern, value);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

// Main
console.log('🔍 Finding files with typography spread...\n');
const srcDir = path.join(__dirname, 'src');
const files = findTsxFiles(srcDir);

let fixedCount = 0;
files.forEach(file => {
  if (fixSpreadOperator(file)) {
    fixedCount++;
  }
});

console.log(`\n✨ Fixed ${fixedCount} files`);
console.log('📱 Reload your app now!\n');
