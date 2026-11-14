// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const customsReportOps = {
  stages: {
    pendingParse: { name: 'Ожидает чтения отчёта', isActive: true },
    pendingApply: { name: 'Решения ожидают применения', isActive: true, hasParsedRows: true },
    parseFailed: { name: 'Ошибка чтения отчёта', isFailed: true },
    applyFailed: { name: 'Ошибка применения решений', hasParsedRows: true, isFailed: true },
    completed: { name: 'Обработан', hasParsedRows: true, isCompleted: true },
    failed: { name: 'Ошибка обработки', hasParsedRows: true, isFailed: true }
  },
  uploadExtensions: ['.xlsx', '.rar'],
  defaultMasterInvoice: '<не определена>',
  nonRetryableStatusCodes: [400, 401, 403, 404],
  errorLabels: {
    emptyRows: 'Пустых строк в отчёте',
    errorInvalidTnVedRecords: 'Несуществующих ТН ВЭД',
    errorDecisionRecords: 'Нераспознанных решений таможенного органа',
    errorProcedureMismatchRecords: 'Несовпадений таможенной процедуры с реестром',
    errorParcelNotFoundRecords: 'Ненайденных посылок',
    errorAlreadyProcessedParcels: 'Посылок с установленным полем ДТЭГ/ПТДЭГ'
  }
}
