/**
 * 数据导出工具
 * 支持 CSV 和 Excel 导出
 */

interface ExportColumn<T = unknown> {
  title: string
  dataIndex: string
  render?: (value: unknown, record: T) => string
}

/**
 * 导出 CSV 文件
 * @param data 数据数组
 * @param columns 列配置
 * @param filename 文件名（不含扩展名）
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export'
): void {
  if (!data || data.length === 0) {
    console.warn('导出数据为空')
    return
  }

  // 生成表头
  const headers = columns.map(col => col.title)

  // 生成数据行
  const rows = data.map(record => {
    return columns.map(col => {
      const value = (record as Record<string, unknown>)[col.dataIndex]
      if (col.render) {
        return col.render(value, record)
      }
      if (value === null || value === undefined) {
        return ''
      }
      const str = String(value)
      // 如果值包含逗号、引号或换行符，需要用引号包裹
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
  })

  // 组装 CSV 内容（添加 BOM 以支持中文）
  const bom = '\uFEFF'
  const csvContent = bom + [headers, ...rows].map(row => row.join(',')).join('\n')

  // 创建 Blob 并下载
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * 导出 Excel 文件（使用 HTML table 转 xlsx 方式）
 * @param data 数据数组
 * @param columns 列配置
 * @param filename 文件名（不含扩展名）
 */
export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export'
): void {
  if (!data || data.length === 0) {
    console.warn('导出数据为空')
    return
  }

  // 构建 HTML 表格
  const headerCells = columns.map(col => `<th style="background-color:#f0f0f0;font-weight:bold;padding:8px;border:1px solid #ddd;">${escapeHtml(col.title)}</th>`).join('')
  const bodyRows = data.map(record => {
    const cells = columns.map(col => {
      const value = (record as Record<string, unknown>)[col.dataIndex]
      let displayValue: string
      if (col.render) {
        displayValue = col.render(value, record)
      } else if (value === null || value === undefined) {
        displayValue = ''
      } else {
        displayValue = String(value)
      }
      return `<td style="padding:8px;border:1px solid #ddd;">${escapeHtml(displayValue)}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Sheet1</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
    </head>
    <body>
      <table style="border-collapse:collapse;">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  downloadBlob(blob, `${filename}.xls`)
}

/**
 * 下载 Blob 文件
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  // 延迟清理
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * HTML 转义
 */
function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return str.replace(/[&<>"']/g, m => map[m] || m)
}
