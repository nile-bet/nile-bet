import { RefObject } from 'react'

export function usePrint(contentRef: RefObject<HTMLDivElement | null>, options?: {
  documentTitle?: string
  pageStyle?: string
  onAfterPrint?: () => void
  onPrintError?: () => void
}) {
  return () => {
    const content = contentRef.current
    if (!content) return

    const printWindow = window.open('', '_blank', 'width=400,height=700')
    if (!printWindow) return

    const pageStyle = options?.pageStyle ?? `
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: 80mm;
      }
      body {
        display: flex;
        justify-content: center;
      }
      .thermal-receipt {
        width: 80mm !important;
        max-width: 80mm !important;
        transform: none !important;
      }
    `

    // Copy Google Fonts link if present
    const fontLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(l => l.outerHTML).join('\n')

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${options?.documentTitle ?? 'Print'}</title>
  ${fontLinks}
  <style>${pageStyle}</style>
</head>
<body>${content.outerHTML}</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    // Wait for fonts/images to load before printing
    setTimeout(() => {
      try {
        printWindow.print()
      } catch (e) {
        options?.onPrintError?.()
      }
      setTimeout(() => {
        printWindow.close()
        options?.onAfterPrint?.()
      }, 500)
    }, 600)
  }
}
