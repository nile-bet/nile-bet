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
      @media print { body { margin: 0; } .thermal-receipt { width: 80mm !important; } }
    `

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${options?.documentTitle ?? 'Print'}</title>
  <style>${pageStyle}</style>
</head>
<body>${content.innerHTML}</body>
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
