const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '../../node_modules/@rdkit/rdkit/dist');
const targetDir = path.resolve(__dirname, '../static/wasm');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy RDKit WASM files
const files = [
  'RDKit_minimal.js',
  'RDKit_minimal.wasm'
];

files.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);

  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Successfully copied ${file} to ${targetPath}`);
    } else {
      console.error(`Source file not found: ${sourcePath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error copying ${file}:`, error);
    process.exit(1);
  }
});