import ExcelJS from 'exceljs'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { FieldMapping } from '../../shared/types'

const SHEET_NAME = 'Data'

export async function appendRowToXlsx(
  filePath: string,
  mapping: FieldMapping[],
  row: Record<string, string>
): Promise<void> {
  const sortedMapping = [...mapping].sort((a, b) => a.order - b.order)
  const workbook = new ExcelJS.Workbook()
  let worksheet: ExcelJS.Worksheet

  if (existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath)
    worksheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.addWorksheet(SHEET_NAME)
  } else {
    mkdirSync(dirname(filePath), { recursive: true })
    worksheet = workbook.addWorksheet(SHEET_NAME)
    worksheet.addRow(sortedMapping.map((column) => column.columnHeader))
  }

  worksheet.addRow(sortedMapping.map((column) => row[column.fieldName] ?? ''))
  await workbook.xlsx.writeFile(filePath)
}
