// Convert flag emoji to country code and return image URL
// Flag emoji are regional indicator symbols: 🇪🇹 = ET
const SUBDIVISION_FLAGS: Record<string, string> = {
  '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F': 'gb-eng',
  '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F': 'gb-sct',
  '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73\uDB40\uDC7F': 'gb-wls',
}

export function flagEmojiToCode(emoji: string): string {
  if (!emoji || emoji === '🏳️') return ''
  if (SUBDIVISION_FLAGS[emoji]) return SUBDIVISION_FLAGS[emoji]
  try {
    const codePoints = [...emoji]
      .map(c => c.codePointAt(0) ?? 0)
      .filter(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF)
      .map(cp => String.fromCharCode(cp - 0x1F1E6 + 65))
    return codePoints.join('').toLowerCase()
  } catch {
    return ''
  }
}

export function flagImageUrl(emoji: string): string {
  const code = flagEmojiToCode(emoji)
  if (!code) return ''
  if (code.includes('-')) {
    return `https://flagcdn.com/${code}.svg`
  }
  return `https://flagcdn.com/24x18/${code}.png`
}
