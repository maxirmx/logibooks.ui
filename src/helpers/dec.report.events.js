// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const DEC_REPORT_UPLOADED_EVENT = 'dec-report-uploaded'

export function dispatchDecReportUploadedEvent(detail = undefined) {
  const event = new globalThis.CustomEvent(DEC_REPORT_UPLOADED_EVENT, { detail })
  window.dispatchEvent(event)
}
