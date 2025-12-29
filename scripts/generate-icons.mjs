import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [192, 512];

// SVG icon with running/lightning bolt theme matching the app
const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <path
    d="M${size * 0.55} ${size * 0.15} L${size * 0.35} ${size * 0.5} L${size * 0.48} ${size * 0.5} L${size * 0.45} ${size * 0.85} L${size * 0.65} ${size * 0.5} L${size * 0.52} ${size * 0.5} Z"
    fill="white"
  />
</svg>
`;

async function generateIcons() {
  const iconsDir = join(__dirname, '..', 'public', 'icons');

  await mkdir(iconsDir, { recursive: true });

  for (const size of sizes) {
    const svg = createSvg(size);
    const outputPath = join(iconsDir, `icon-${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${outputPath}`);
  }

  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
