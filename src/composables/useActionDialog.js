import { reactive } from 'vue'

export const ACTION_DIALOG_TITLES = {
  'export-all-xml-without-excise': 'Подготовка файлов',
  'export-all-xml-excise': 'Подготовка файлов',
  'download-register': 'Подготовка файла реестра',
  'upload-register': 'Загрузка реестра',
  'upload-report': 'Загрузка отчёта',
  'download-invoice': 'Подготовка файла инвойса',
}

const DEFAULT_TITLE = 'Пожалуйста, подождите'

export function createActionDialogState() {
  return reactive({
    show: false,
    operation: null,
    title: ''
  })
}

export function useActionDialog({
  titles = ACTION_DIALOG_TITLES,
  state = null
} = {}) {
  const actionDialogState = state ?? createActionDialogState()

  function showActionDialog(operation, customTitle) {
    actionDialogState.operation = operation ?? null
    actionDialogState.title = customTitle ?? titles?.[operation] ?? DEFAULT_TITLE
    actionDialogState.show = true
  }

  function hideActionDialog() {
    actionDialogState.show = false
    actionDialogState.operation = null
    actionDialogState.title = ''
  }

  return {
    actionDialogState,
    showActionDialog,
    hideActionDialog
  }
}
