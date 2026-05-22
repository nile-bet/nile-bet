const fs = require('fs')
const path = require('path')

// Create icons directory
const iconsDir = path.join(
  __dirname, '..', 'public', 'icons'
)
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Create a simple SVG icon and convert to PNG placeholder
// In production, replace with actual branded icons

const sizes = [
  72, 96, 128, 144,
  152, 192, 384, 512,
]

// Generate simple SVG placeholder icons
sizes.forEach((size) => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#1A1A2E"/>
  <rect x="${size * 0.08}" y="${size * 0.08}" width="${size * 0.84}" height="${size * 0.84}" rx="${size * 0.1}" fill="#1B3A6B"/>
  <text x="50%" y="58%" font-family="serif" font-size="${size * 0.4}" font-weight="bold" fill="#C9A84C" text-anchor="middle" dominant-baseline="middle">N</text>
  <line x1="${size * 0.2}" y1="${size * 0.82}" x2="${size * 0.8}" y2="${size * 0.82}" stroke="#C9A84C" stroke-width="${size * 0.04}" stroke-linecap="round"/>
</svg>`

  fs.writeFileSync(
    path.join(iconsDir, `icon-${size}x${size}.svg`),
    svg
  )
  console.log(`Created icon-${size}x${size}.svg`)
})

console.log('Icons generated in public/icons/')
