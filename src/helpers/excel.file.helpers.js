export const EXCEL_FILE_ACCEPT = '.xls,.xlsx,.xlsm'
export const EXCEL_ARCHIVE_FILE_ACCEPT = `${EXCEL_FILE_ACCEPT},.zip,.rar`

export function resetExcelFileInput(input) {
  if (input) input.value = ''
}

export function openExcelFilePicker(input) {
  if (!input || typeof input.click !== 'function') return false
  resetExcelFileInput(input)
  input.click()
  return true
}

export function takeSelectedExcelFile(event) {
  const file = event?.target?.files?.[0]
  resetExcelFileInput(event?.target)
  return file
}
