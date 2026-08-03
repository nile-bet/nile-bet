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

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${options?.documentTitle ?? 'Print'}</title>
  <style>${pageStyle}</style>
</head>
<body>${content.outerHTML}</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
      options?.onAfterPrint?.()
    }, 400)
  }
}
