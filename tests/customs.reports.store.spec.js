// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { computed, effectScope, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { customsReportOps } from './helpers/customs-report-ops.fixture.js'
import { useCustomsReportsStore } from '@/stores/customs.reports.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { DEC_REPORT_UPLOADED_EVENT } from '@/helpers/dec.report.events.js'
import { useCustomsReportPolling } from '@/composables/useCustomsReportPolling.js'

const { fetchOps, fetchReports } = vi.hoisted(() => ({ fetchOps: vi.fn(), fetchReports: vi.fn() }))

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    postFile: vi.fn(),
    get: url => url.endsWith('/ops') ? fetchOps(url) : fetchReports(url),
    delete: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('customs.reports.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    fetchOps.mockReset().mockResolvedValue(customsReportOps)
    fetchReports.mockReset()
  })

  it('coalesces metadata requests and retries after invalid ops metadata', async () => {
    const store = useCustomsReportsStore()
    fetchOps.mockResolvedValueOnce(null)
    const first = store.getReportStatus(10)
    const second = store.getReportStatus(11)
    for (const request of [first, second]) {
      await expect(request).rejects.toThrow('Не удалось загрузить настройки отчётов о выпуске')
    }
    expect(fetchOps).toHaveBeenCalledOnce()
    expect(fetchReports).not.toHaveBeenCalled()
    const report = { id: 10, stage: 'completed' }
    fetchReports.mockResolvedValue(report)
    await expect(store.getReportStatus(10)).resolves.toBe(report)
    await expect(store.getReportStatus(10)).resolves.toBe(report)
    expect(fetchOps).toHaveBeenCalledTimes(2)
    expect(store.reportStage(report)).toEqual(customsReportOps.stages.completed)
  })

  it.each([
    new Error('Network error'),
    Object.assign(new Error('Service unavailable'), { status: 503 })
  ])('recovers status polling after transient metadata failures: %s', async failure => {
    vi.useFakeTimers()
    const store = useCustomsReportsStore()
    const scope = effectScope()
    const alerts = useAlertStore()
    const alert = vi.spyOn(alerts, 'error')
    const pageAlert = mount(PageAlertRegion, { props: { fallback: true } })
    const report = ref(null)
    const completed = { id: 5, stage: 'completed' }
    fetchOps.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure)
    fetchReports.mockResolvedValue(completed)
    try {
      scope.run(() => useCustomsReportPolling(
        computed(() => report.value ? null : 5),
        async () => { report.value = await store.getReportStatus(5) },
        error => alerts.error(error, { fallback: 'Не удалось получить состояние отчёта' }),
        { startImmediately: true, canRetry: store.canRetryReportStatus }
      ))
      await vi.advanceTimersByTimeAsync(0)
      expect(fetchOps).toHaveBeenCalledOnce()
      expect(fetchReports).not.toHaveBeenCalled()
      expect(alert).toHaveBeenCalledExactlyOnceWith(failure, {
        fallback: 'Не удалось получить состояние отчёта'
      })
      expect(pageAlert.get('[role="alert"]').text()).toContain('Не удалось')
      expect(pageAlert.text()).not.toContain(failure.message)
      await vi.advanceTimersByTimeAsync(2000)
      expect(fetchOps).toHaveBeenCalledTimes(2)
      expect(alert).toHaveBeenCalledOnce()
      await vi.advanceTimersByTimeAsync(2000)
      expect(fetchOps).toHaveBeenCalledTimes(3)
      expect(fetchReports).toHaveBeenCalledExactlyOnceWith('http://localhost:8080/api/customsreports/5')
      expect(report.value).toEqual(completed)
      expect(store.ops).toEqual(customsReportOps)
      await vi.advanceTimersByTimeAsync(4000)
      expect(fetchReports).toHaveBeenCalledOnce()
      expect(alert).toHaveBeenCalledOnce()
      expect(store.canRetryReportStatus({ status: 404 })).toBe(false)
      expect(store.canRetryReportStatus(failure)).toBe(true)
    } finally {
      scope.stop()
      pageAlert.unmount()
      store.$dispose()
      vi.useRealTimers()
    }
  })

  it('uploads file using fetchWrapper.postFile', async () => {
    const store = useCustomsReportsStore()
    const file = new File(['content'], 'dec.xlsx', { type: 'application/vnd.ms-excel' })
    const response = { id: 42, success: false, stage: 'pendingParse' }
    fetchWrapper.postFile.mockResolvedValue(response)

    const promise = store.upload(file)
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBe(response)

    expect(fetchWrapper.postFile).toHaveBeenCalledTimes(1)
    const [url, formData] = fetchWrapper.postFile.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/customsreports/upload-report')
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('file')).toBe(file)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    store.$dispose()
  })

  it('skips sending a file if the account changes while loading metadata', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    const metadata = Promise.withResolvers()
    fetchOps.mockReturnValueOnce(metadata.promise)

    const upload = store.upload(new File(['content'], 'old.xlsx'))
    expect(store.loading).toBe(true)
    authStore.user = { id: 2 }
    metadata.resolve(customsReportOps)

    await expect(upload).resolves.toBeUndefined()
    expect(fetchWrapper.postFile).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
  })

  it.each(['success', 'failure'])('isolates a previous-account upload %s from the current upload', async outcome => {
    vi.useFakeTimers()
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    try {
      const previous = Promise.withResolvers()
      const current = Promise.withResolvers()
      fetchWrapper.postFile.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise)
      const first = store.upload(new File(['old'], 'old.xlsx'))
      await vi.advanceTimersByTimeAsync(0)
      expect(fetchWrapper.postFile).toHaveBeenCalledOnce()

      authStore.user = { id: 2 }
      expect(store.loading).toBe(false)
      const next = store.upload(new File(['current'], 'current.xlsx'))
      if (outcome === 'success') {
        previous.resolve({ id: 51, stage: 'pendingParse' })
        await expect(first).resolves.toBeUndefined()
      } else {
        const failure = new Error('Previous upload failed')
        previous.reject(failure)
        await expect(first).rejects.toBe(failure)
      }
      expect(store.loading).toBe(true)
      expect(store.error).toBeNull()

      const accepted = { id: 52, stage: 'pendingParse' }
      current.resolve(accepted)
      await expect(next).resolves.toBe(accepted)
      expect(store.loading).toBe(false)
      fetchReports.mockResolvedValue({ id: 52, stage: 'completed' })
      await vi.advanceTimersByTimeAsync(2000)
      expect(fetchReports).toHaveBeenCalledExactlyOnceWith('http://localhost:8080/api/customsreports/52')
    } finally {
      store.$dispose()
      vi.useRealTimers()
    }
  })

  it('keeps tracking an accepted upload without a mounted report view and emits one completion event', async () => {
    vi.useFakeTimers()
    const store = useCustomsReportsStore()
    const listener = vi.fn()
    window.addEventListener(DEC_REPORT_UPLOADED_EVENT, listener)
    try {
      fetchWrapper.postFile.mockResolvedValue({ id: 50, stage: 'pendingParse', fileName: 'report.zip' })
      fetchReports.mockResolvedValueOnce({ id: 50, stage: 'pendingApply' })
        .mockResolvedValue({ id: 50, stage: 'completed', fileName: 'entry.xlsx' })

      await store.upload(new File(['content'], 'report.zip'))
      expect(listener).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(2000)
      expect(fetchReports).toHaveBeenCalledWith('http://localhost:8080/api/customsreports/50')
      expect(listener).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(4000)
      expect(fetchReports).toHaveBeenCalledTimes(2)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].detail).toEqual({ reportId: 50, fileName: 'entry.xlsx' })
    } finally {
      window.removeEventListener(DEC_REPORT_UPLOADED_EVENT, listener)
      store.$dispose()
      vi.useRealTimers()
    }
  })

  it.each(['parseFailed', 'applyFailed'])('presents %s once after leaving the report view', async stage => {
    vi.useFakeTimers()
    const store = useCustomsReportsStore()
    const alerts = useAlertStore()
    const alert = vi.spyOn(alerts, 'error')
    try {
      const errMsg = 'Обработка файла прервана. Загрузите файл отчёта повторно.'
      fetchWrapper.postFile.mockResolvedValue({ id: 52, stage: 'pendingParse' })
      fetchReports.mockResolvedValue({ id: 52, stage, errMsg })
      await store.upload(new File(['content'], 'report.xlsx'))
      await vi.advanceTimersByTimeAsync(2000)
      await store.getReportStatus(52)
      expect(alert).toHaveBeenCalledTimes(1)
      expect(alerts.alert).toMatchObject({ message: errMsg, title: 'Отчёт №52' })
    } finally {
      store.$dispose()
      vi.useRealTimers()
    }
  })

  it('gives the report page ownership of the terminal failure for its report', async () => {
    const store = useCustomsReportsStore()
    const showStatus = vi.fn()
    const report = { id: 52, stage: 'parseFailed', errMsg: 'Неверный формат' }
    fetchWrapper.postFile.mockResolvedValue({ id: 52, stage: 'pendingParse' })
    fetchReports.mockResolvedValue(report)
    await store.upload(new File(['content'], 'report.xlsx'))
    const unregister = store.displayReportStatus(52, showStatus)
    await store.getReportStatus(52)
    expect(showStatus).toHaveBeenCalledExactlyOnceWith(report)
    expect(useAlertStore().alert).toBeNull()
    unregister()
    store.$dispose()
  })

  it('delivers recovered active and completed statuses after the initial lookup fails', async () => {
    vi.useFakeTimers()
    const store = useCustomsReportsStore()
    const showStatus = vi.fn()
    const applying = { id: 52, stage: 'pendingApply' }
    const completed = { id: 52, stage: 'completed' }
    let unregister
    try {
      fetchWrapper.postFile.mockResolvedValue({ id: 52, stage: 'pendingParse' })
      fetchReports.mockRejectedValueOnce(new Error('status unavailable'))
        .mockResolvedValueOnce(applying).mockResolvedValueOnce(completed)
      await store.upload(new File(['content'], 'report.xlsx'))
      unregister = store.displayReportStatus(52, showStatus)
      await expect(store.getReportStatus(52)).rejects.toThrow('status unavailable')
      await vi.advanceTimersByTimeAsync(4000)
      expect(showStatus.mock.calls).toEqual([[applying], [completed]])
      await vi.advanceTimersByTimeAsync(2000)
      expect(fetchReports).toHaveBeenCalledTimes(3)
    } finally {
      unregister?.()
      store.$dispose()
      vi.useRealTimers()
    }
  })

  it('notifies once when a report disappears during background monitoring and keeps tracking other uploads', async () => {
    vi.useFakeTimers()
    const store = useCustomsReportsStore()
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    const alerts = useAlertStore()
    const alert = vi.spyOn(alerts, 'error')
    const pageAlert = mount(PageAlertRegion, { props: { fallback: true } })
    const missing = Object.assign(new Error('Отчёт не найден'), { status: 404 })
    const removedStatus = vi.fn()
      .mockResolvedValueOnce({ id: 51, stage: 'pendingApply' }).mockRejectedValue(missing)
    const otherStatus = vi.fn()
      .mockResolvedValueOnce({ id: 53, stage: 'pendingApply' })
      .mockResolvedValueOnce({ id: 53, stage: 'pendingApply' })
      .mockResolvedValue({ id: 53, stage: 'completed' })
    try {
      fetchWrapper.postFile.mockResolvedValueOnce({ id: 51, stage: 'pendingParse' })
        .mockResolvedValueOnce({ id: 53, stage: 'pendingParse' })
      fetchReports.mockImplementation(url => url.endsWith('/51') ? removedStatus() : otherStatus())
      await store.upload(new File(['content'], 'removed.xlsx'))
      await store.upload(new File(['content'], 'other.xlsx'))
      await vi.advanceTimersByTimeAsync(8000)
      expect(removedStatus).toHaveBeenCalledTimes(2)
      expect(otherStatus).toHaveBeenCalledTimes(3)
      expect(pageAlert.get('[role="alert"]').text()).toContain('Отчёт №51: Отчёт не найден')
      await expect(store.getReportStatus(51)).rejects.toBe(missing)
      expect(alert).toHaveBeenCalledOnce()
    } finally {
      pageAlert.unmount()
      diagnostic.mockRestore()
      store.$dispose()
      vi.useRealTimers()
    }
  })

  it('lets the mounted report view present a permanent status failure', async () => {
    const store = useCustomsReportsStore()
    fetchWrapper.postFile.mockResolvedValue({ id: 52, stage: 'pendingParse' })
    const forbidden = Object.assign(new Error('Недостаточно прав'), { status: 403 })
    fetchReports.mockRejectedValue(forbidden)
    await store.upload(new File(['content'], 'report.xlsx'))
    const unregister = store.displayReportStatus(52, vi.fn())
    try {
      await expect(store.getReportStatus(52)).rejects.toBe(forbidden)
      expect(useAlertStore().alert).toBeNull()
    } finally {
      unregister()
      store.$dispose()
    }
  })

  it('shows one background error per retryable outage and clears tracking on an account change', async () => {
    vi.useFakeTimers()
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    const alerts = useAlertStore()
    const alert = vi.spyOn(alerts, 'error')
    const pageAlert = mount(PageAlertRegion, { props: { fallback: true } })
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      fetchWrapper.postFile.mockResolvedValue({ id: 51, stage: 'pendingParse' })
      const unavailable = Object.assign(new Error('Service unavailable'), { status: 503 })
      fetchReports.mockRejectedValueOnce(unavailable).mockRejectedValueOnce(unavailable)
        .mockResolvedValueOnce({ id: 51, stage: 'pendingApply' }).mockRejectedValue(unavailable)
      await store.upload(new File(['content'], 'report.xlsx'))
      await vi.advanceTimersByTimeAsync(4000)
      expect(diagnostic).toHaveBeenCalledOnce()
      expect(fetchReports).toHaveBeenCalledTimes(2)
      expect(pageAlert.get('[role="alert"]').text()).toContain('Отчёт №51: Не удалось получить состояние отчёта о выпуске')
      expect(alert).toHaveBeenCalledOnce()
      await pageAlert.get('button').trigger('click')
      await vi.advanceTimersByTimeAsync(2000)
      expect(pageAlert.find('[role="alert"]').exists()).toBe(false)
      await vi.advanceTimersByTimeAsync(2000)
      expect(pageAlert.get('[role="alert"]').text()).toContain('Отчёт №51')
      expect(alert).toHaveBeenCalledTimes(2)
      authStore.user = { id: 2 }
      await vi.advanceTimersByTimeAsync(4000)
      expect(fetchReports).toHaveBeenCalledTimes(4)
    } finally {
      pageAlert.unmount()
      diagnostic.mockRestore()
      store.$dispose()
      vi.useRealTimers()
    }
  })

  it('shares retryable failure presentation between the mounted view and background tracking', async () => {
    const store = useCustomsReportsStore()
    const alerts = useAlertStore()
    const pageAlert = mount(PageAlertRegion, { props: { fallback: true } })
    const failure = new Error('Service unavailable')
    fetchWrapper.postFile.mockResolvedValue({ id: 51, stage: 'pendingParse' })
    fetchReports.mockRejectedValue(failure)
    try {
      await store.upload(new File(['content'], 'report.xlsx'))
      const unregister = store.displayReportStatus(51, vi.fn())
      await expect(store.getReportStatus(51)).rejects.toBe(failure)
      expect(pageAlert.find('[role="alert"]').exists()).toBe(false)
      expect(store.claimReportStatusFailure(51, failure)).toBe(true)
      alerts.error(failure, { fallback: 'Не удалось получить состояние отчёта' })
      await nextTick()
      expect(pageAlert.get('[role="alert"]').text()).toContain('Не удалось получить состояние отчёта')
      await pageAlert.get('button').trigger('click')
      unregister()
      await expect(store.getReportStatus(51)).rejects.toBe(failure)
      expect(pageAlert.find('[role="alert"]').exists()).toBe(false)
    } finally {
      pageAlert.unmount()
      store.$dispose()
    }
  })

  it.each(['getReports', 'getReportRows'])('clears committed and pending %s data on account change', async method => {
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    const read = method === 'getReports' ? () => store.getReports() : () => store.getReportRows(5)
    const snapshot = {
      items: [{ id: 10 }],
      pagination: { totalCount: 42, hasNextPage: true, hasPreviousPage: true },
      columns: ['id'],
      customsProcedure: 'ИМ 40'
    }
    fetchReports.mockResolvedValueOnce(snapshot)
    await read()

    const stale = Promise.withResolvers()
    fetchReports.mockReturnValueOnce(stale.promise)
    const pending = read()
    await Promise.resolve()
    expect(store.loading).toBe(true)
    authStore.user = { id: 2 }
    expect(store.loading).toBe(false)
    const expectEmpty = () => expect(store).toMatchObject({
      reports: [], reportsTotalCount: 0, reportsHasNextPage: false, reportsHasPreviousPage: false,
      reportRows: [], reportRowsTotalCount: 0, reportRowsHasNextPage: false, reportRowsHasPreviousPage: false,
      reportRowsColumns: [], reportRowsCustomsProcedure: null, error: null
    })
    expectEmpty()
    stale.resolve(snapshot)
    await pending
    expectEmpty()
  })

  it.each(['getReports', 'getReportRows'])('propagates obsolete %s failures without altering the current request', async method => {
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    const read = method === 'getReports' ? () => store.getReports() : () => store.getReportRows(5)
    const stale = Promise.withResolvers()
    const current = Promise.withResolvers()
    fetchReports.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise)
    const pending = read()
    await vi.waitFor(() => expect(fetchReports).toHaveBeenCalledOnce())
    authStore.user = { id: 2 }
    const next = read()
    const error = new Error('Late failure')
    stale.reject(error)
    await expect(pending).rejects.toBe(error)
    expect(store.loading).toBe(true)
    expect(store.error).toBeNull()
    const items = [{ id: 20 }]
    current.resolve({ items })
    await next
    expect(method === 'getReports' ? store.reports : store.reportRows).toEqual(items)
    expect(store.loading).toBe(false)
  })

  it('discards previous-account status results and keeps the current status request coalesced', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    const stale = Promise.withResolvers()
    const current = Promise.withResolvers()
    fetchReports.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise)
    const first = store.getReportStatus(5)
    await vi.waitFor(() => expect(fetchReports).toHaveBeenCalledOnce())
    authStore.user = { id: 2 }
    const next = store.getReportStatus(5)
    stale.resolve({ id: 5, stage: 'completed', masterInvoice: 'OLD-INVOICE' })
    await expect(first).resolves.toBeUndefined()
    const coalesced = store.getReportStatus(5)
    const report = { id: 5, stage: 'completed' }
    current.resolve(report)
    await expect(next).resolves.toBe(report)
    await expect(coalesced).resolves.toBe(report)
    expect(fetchReports).toHaveBeenCalledTimes(2)
  })

  it('does not start a previous-account list or status read after loading metadata', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    const metadata = Promise.withResolvers()
    fetchOps.mockReturnValueOnce(metadata.promise)
    const reports = store.getReports()
    const status = store.getReportStatus(5)
    authStore.user = { id: 2 }
    metadata.resolve(customsReportOps)
    await Promise.all([reports, status])
    expect(fetchReports).not.toHaveBeenCalled()
  })

  it('coalesces status reads and propagates their rejection', async () => {
    const store = useCustomsReportsStore()
    fetchReports.mockRejectedValue(new Error('status failed'))
    await Promise.all([
      expect(store.getReportStatus(10)).rejects.toThrow('status failed'),
      expect(store.getReportStatus(10)).rejects.toThrow('status failed')
    ])
    expect(fetchReports).toHaveBeenCalledTimes(1)
  })

  it('stores error and rethrows when upload fails', async () => {
    const store = useCustomsReportsStore()
    const file = new File(['bad'], 'dec.xlsx')
    const error = new Error('upload failed')
    fetchWrapper.postFile.mockRejectedValue(error)

    await expect(store.upload(file)).rejects.toThrow('upload failed')
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('includes search when fetching reports', async () => {
    const authStore = useAuthStore()
    authStore.uploadcustomsreports_page = 2
    authStore.uploadcustomsreports_per_page = 50
    authStore.uploadcustomsreports_sort_by = [{ key: 'errorCount', order: 'desc' }]
    authStore.uploadcustomsreports_search = 'MASTER-001'

    const store = useCustomsReportsStore()
    fetchReports.mockResolvedValue({ items: [], pagination: { totalCount: 0 } })

    await store.getReports()

    expect(fetchReports).toHaveBeenCalledWith(
      'http://localhost:8080/api/customsreports?page=2&pageSize=50&sortBy=errorCount&sortOrder=desc&search=MASTER-001'
    )
  })

  it('uses empty report fallbacks when paged response is null', async () => {
    const store = useCustomsReportsStore()
    fetchReports.mockResolvedValue(null)

    await store.getReports()

    expect(store.reports).toEqual([])
    expect(store.reportsTotalCount).toBe(0)
    expect(store.reportsHasNextPage).toBe(false)
    expect(store.reportsHasPreviousPage).toBe(false)
  })

  it('stores error when getReports fails', async () => {
    const store = useCustomsReportsStore()
    const error = new Error('fetch failed')
    fetchReports.mockRejectedValue(error)

    const promise = store.getReports()
    expect(store.loading).toBe(true)
    await expect(promise).rejects.toBe(error)

    expect(store.error).toBe(error)
    expect(store.reports).toEqual([])
    expect(store.reportsTotalCount).toBe(0)
    expect(store.loading).toBe(false)
  })

  it('remove calls API and refreshes reports on success', async () => {
    fetchWrapper.delete.mockResolvedValue({})
    fetchReports.mockResolvedValue({
      items: [],
      pagination: {
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }
    })

    const store = useCustomsReportsStore()

    await store.remove(10)

    expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/customsreports/10')
    expect(fetchReports).toHaveBeenCalledWith(
      'http://localhost:8080/api/customsreports?page=1&pageSize=100&sortBy=id&sortOrder=desc'
    )
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('remove propagates 404 error and sets error', async () => {
    const err = { status: 404, message: 'Not found' }
    fetchWrapper.delete.mockRejectedValue(err)

    const store = useCustomsReportsStore()

    await expect(store.remove(999)).rejects.toEqual(err)
    expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/customsreports/999')
    expect(store.loading).toBe(false)
    expect(store.error).toEqual(err)
  })

  it.each(['success', 'failure'])('isolates a previous-account delete %s from the current delete', async outcome => {
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    const previous = Promise.withResolvers()
    const current = Promise.withResolvers()
    fetchWrapper.delete.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise)
    const first = store.remove(10)
    expect(store.loading).toBe(true)

    authStore.user = { id: 2 }
    expect(store.loading).toBe(false)
    const next = store.remove(20)
    if (outcome === 'success') {
      previous.resolve()
      await first
    } else {
      const failure = new Error('Previous delete failed')
      previous.reject(failure)
      await expect(first).rejects.toBe(failure)
    }
    expect(fetchOps).not.toHaveBeenCalled()
    expect(fetchReports).not.toHaveBeenCalled()
    expect(store.loading).toBe(true)
    expect(store.error).toBeNull()

    fetchReports.mockResolvedValueOnce({ items: [{ id: 21 }] })
    current.resolve()
    await next
    expect(fetchReports).toHaveBeenCalledOnce()
    expect(store.reports).toEqual([{ id: 21 }])
    expect(store.loading).toBe(false)
  })

  it.each(['success', 'failure'])('isolates a previous-account delete refresh %s', async outcome => {
    const authStore = useAuthStore()
    authStore.user = { id: 1 }
    const store = useCustomsReportsStore()
    const previousRefresh = Promise.withResolvers()
    fetchWrapper.delete.mockResolvedValueOnce()
    fetchReports.mockReturnValueOnce(previousRefresh.promise).mockResolvedValueOnce({ items: [{ id: 20 }] })
    const previous = store.remove(10)
    await vi.waitFor(() => expect(fetchReports).toHaveBeenCalledOnce())

    authStore.user = { id: 2 }
    expect(store.loading).toBe(false)
    await store.getReports()
    if (outcome === 'success') {
      previousRefresh.resolve({ items: [{ id: 11 }] })
      await previous
    } else {
      const failure = new Error('Previous refresh failed')
      previousRefresh.reject(failure)
      await expect(previous).rejects.toBe(failure)
    }

    expect(store.reports).toEqual([{ id: 20 }])
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('fetches report rows using fetchWrapper.get', async () => {
    const store = useCustomsReportsStore()
    const mockResponse = {
      items: [
        {
          rowNumber: 1,
          parcelNumber: 'TRACK001',
          uin: 'UIN-001',
          masterInvoice: 'MASTER-001',
          description: 'УИН:UIN-001; товар',
          customsDutiesAndTaxes: 'пошлины',
          customsFees: 'сборы',
          customsPaymentReservationId: 12345,
          dateTime: '2026-05-07 10:30',
          comments: '10-выпуск'
        },
        { rowNumber: 2, trackingNumber: 'TRACK002', decision: 'Запрет выпуска' }
      ],
      pagination: {
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false
      },
      customsProcedure: 'ИМ 40',
      columns: ['id', 'parcelNumber', 'processingResult', 'uin']
    }
    fetchReports.mockResolvedValue(mockResponse)

    const promise = store.getReportRows(5)
    expect(store.loading).toBe(true)
    await promise

    expect(fetchReports).toHaveBeenCalledTimes(1)
    expect(fetchReports).toHaveBeenCalledWith(
      'http://localhost:8080/api/customsreports/5/rows?page=1&pageSize=100&sortBy=id&sortOrder=asc'
    )
    expect(store.reportRows).toEqual(mockResponse.items)
    expect(store.reportRows[0]).toMatchObject({
      uin: 'UIN-001',
      masterInvoice: 'MASTER-001',
      customsPaymentReservationId: 12345,
      comments: '10-выпуск'
    })
    expect(store.reportRowsTotalCount).toBe(2)
    expect(store.reportRowsHasNextPage).toBe(false)
    expect(store.reportRowsHasPreviousPage).toBe(false)
    expect(store.reportRowsCustomsProcedure).toBe('ИМ 40')
    expect(store.reportRowsColumns).toEqual(['id', 'parcelNumber', 'processingResult', 'uin'])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('includes search when fetching report rows', async () => {
    const authStore = useAuthStore()
    authStore.customsreportrows_page = 3
    authStore.customsreportrows_per_page = 25
    authStore.customsreportrows_sort_by = [{ key: 'uin', order: 'desc' }]
    authStore.customsreportrows_search = 'UIN-001'

    const store = useCustomsReportsStore()
    fetchReports.mockResolvedValue({ items: [], pagination: { totalCount: 0 } })

    await store.getReportRows(5)

    expect(fetchReports).toHaveBeenCalledWith(
      'http://localhost:8080/api/customsreports/5/rows?page=3&pageSize=25&sortBy=uin&sortOrder=desc&search=UIN-001'
    )
  })

  it('discards the old report rows while the replacement request is queued', async () => {
    const store = useCustomsReportsStore()
    const oldRows = { items: [{ id: 15 }], columns: ['id'], customsProcedure: 'ИМ 40' }
    const stale = Promise.withResolvers()
    fetchReports.mockResolvedValueOnce(oldRows).mockReturnValueOnce(stale.promise)
    await store.getReportRows(5)
    const pending = store.getReportRows(5)
    store.resetReportRows()
    expect(store.reportRows).toEqual([])
    stale.resolve(oldRows)
    await pending
    expect(store.reportRows).toEqual([])
    expect(store.reportRowsColumns).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()

    const items = [{ id: 16 }]
    fetchReports.mockResolvedValueOnce({ items })
    await store.getReportRows(6)
    expect(store.reportRows).toEqual(items)
  })

  it('uses empty row fallbacks when paged response is null', async () => {
    const store = useCustomsReportsStore()
    fetchReports.mockResolvedValue(null)

    await store.getReportRows(10)

    expect(store.reportRows).toEqual([])
    expect(store.reportRowsTotalCount).toBe(0)
    expect(store.reportRowsHasNextPage).toBe(false)
    expect(store.reportRowsHasPreviousPage).toBe(false)
    expect(store.reportRowsColumns).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()
  })

  it('stores error when getReportRows fails', async () => {
    const store = useCustomsReportsStore()
    store.reportRowsColumns = ['id', 'parcelNumber']
    store.reportRowsCustomsProcedure = 'ЭК 10'
    const error = new Error('fetch rows failed')
    fetchReports.mockRejectedValue(error)

    const promise = store.getReportRows(10)
    expect(store.loading).toBe(true)
    await expect(promise).rejects.toBe(error)

    expect(store.error).toBe(error)
    expect(store.reportRows).toEqual([])
    expect(store.reportRowsColumns).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()
    expect(store.loading).toBe(false)
  })
})
