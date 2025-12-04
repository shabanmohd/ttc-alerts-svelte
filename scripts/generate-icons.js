import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = join(__dirname, '../static/icons/icon.svg');
const outputDir = join(__dirname, '../static/icons');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Read SVG
const svgBuffer = readFileSync(svgPath);

// Generate PNGs for each size
async function generateIcons() {
  console.log('Generating PWA icons...');
  
  for (const size of sizes) {
    const outputPath = join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated ${outputPath}`);
  }
  
  // Generate Apple touch icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(outputDir, 'apple-touch-icon.png'));
  console.log('✅ Generated apple-touch-icon.png');
  
  // Generate favicon (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(outputDir, '../favicon.png'));
  console.log('✅ Generated favicon.png');
  
  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
