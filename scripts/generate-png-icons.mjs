import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
)
const iconsDir = path.join(
  __dirname, '..', 'public', 'icons'
)

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

sizes.forEach((size) => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#1A1A2E'
  const r = size * 0.15
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Inner box
  ctx.fillStyle = '#1B3A6B'
  const pad = size * 0.08
  ctx.beginPath()
  ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, size * 0.1)
  ctx.fill()

  // Letter N
  ctx.fillStyle = '#C9A84C'
  ctx.font = `bold ${size * 0.42}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', size / 2, size * 0.47)

  // Gold line
  ctx.strokeStyle = '#C9A84C'
  ctx.lineWidth = size * 0.04
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(size * 0.2, size * 0.83)
  ctx.lineTo(size * 0.8, size * 0.83)
  ctx.stroke()

  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(
    path.join(iconsDir, `icon-${size}x${size}.png`),
    buffer
  )
  console.log(`✅ icon-${size}x${size}.png`)
})
