// Convert flag emoji to country code and return image URL
// Flag emoji are regional indicator symbols: 🇪🇹 = ET
export function flagEmojiToCode(emoji: string): string {
  if (!emoji || emoji === '🏳️') return ''
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
  return `https://flagcdn.com/24x18/${code}.png`
}
