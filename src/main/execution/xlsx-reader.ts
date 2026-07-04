import ExcelJS from 'exceljs'

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && 'text' in value) return String(value.text)
  return String(value)
}

export async function readXlsxHeaders(filePath: string): Promise<string[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    headers.push(cellToString(cell.value))
  })
  return headers
}

export async function readColumnValues(filePath: string, columnHeader: string): Promise<string[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const headerRow = worksheet.getRow(1)
  let columnIndex = -1
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (cellToString(cell.value) === columnHeader) {
      columnIndex = colNumber
    }
  })
  if (columnIndex === -1) {
    throw new Error(`Колонка "${columnHeader}" не найдена в файле`)
  }

  const values: string[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const value = cellToString(row.getCell(columnIndex).value).trim()
    if (value.length > 0) {
      values.push(value)
    }
  })
  return values
}
