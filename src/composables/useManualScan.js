// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.

import { computed, markRaw, onMounted, onUnmounted, provide, reactive, ref, toValue, watch } from 'vue'
import { PARCEL_SCAN, MANUAL_SCAN_KEY } from '@/helpers/manual.scan.helpers.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { APP_DIALOG_BUTTON_PROPS } from '@/helpers/dialog.helpers.js'
import { getErrorMessage, reportError } from '@/helpers/error.helpers.js'

export function useManualScan({ registerId, job = null, disabled = false, target = PARCEL_SCAN,
  scopeKey = null, refresh, onRecoveryFeedback }) {
  const scanTarget = computed(() => toValue(target))
  const store = useScanjobsStore()
  const auth = useAuthStore()
  const alerts = useAlertStore()
  const confirm = useAppConfirm()
  const listChannel = job ? null : store.createScanJobsListChannel()
  const activeJobs = ref([])
  const jobsLoading = ref(false)
  const busy = ref(false)
  const confirming = ref(false)
  const locked = computed(() => busy.value || confirming.value)
  const pendingBatch = ref(null)
  const uncertainOutcome = ref(false)
  const completedBatchIds = ref([])
  const constants = computed(() => {
    const values = store.ops.constants
    return values && [values.inProgressStatus, values[scanTarget.value.incompatibleType], values.lookupOperation].every(Number.isInteger) ? values : null
  })
  const jobs = computed(() => (job ? [toValue(job)] : activeJobs.value)
    .filter(candidate => candidate && constants.value && Number(candidate.status) === constants.value.inProgressStatus))
  const canScan = computed(() => [auth.isAdmin, auth.isWhManager, auth.isWhOperator].some(value => Boolean(toValue(value))))
  let mounted = true
  let version = 0
  let jobsVersion = 0
  let completedScanCodes = new Set()
  let failureAlertId = null

  function disabledReason(candidate) {
    return scanTarget.value.disabledReason(candidate, constants.value)
  }

  function compatibleJobs() {
    return jobs.value.filter(candidate => !disabledReason(candidate))
  }

  function jobLabel(candidate) {
    return candidate.name || 'Без названия'
  }

  async function loadJobDefinitions() {
    try {
      await store.ensureOpsLoaded()
      if (!constants.value) throw new Error('Не удалось загрузить параметры сканирования.')
      return true
    } catch (error) {
      if (mounted) alerts.error(error, { fallback: 'Не удалось загрузить справочник заданий сканирования' })
      else reportError(error, { context: 'manual scan definitions after unmount' })
      return false
    }
  }

  async function refreshJobs() {
    if (job) return
    const requestVersion = ++jobsVersion
    const partyId = Number(toValue(registerId))
    jobsLoading.value = true
    try {
      const result = await store.getInProgress()
      if (mounted && requestVersion === jobsVersion) {
        activeJobs.value = result.filter(item => Number(item.registerId) === partyId)
      }
    } catch (error) {
      if (mounted && requestVersion === jobsVersion) {
        activeJobs.value = []
        alerts.error(error, { fallback: 'Не удалось загрузить задания сканирования' })
      }
    } finally {
      if (mounted && requestVersion === jobsVersion) jobsLoading.value = false
    }
  }

  async function run(parcels, jobId, bulk = false) {
    if (!mounted || !canScan.value || locked.value || uncertainOutcome.value || toValue(disabled) || !parcels.length) return false
    const adapter = scanTarget.value
    const runVersion = version
    const current = () => mounted && runVersion === version
    const frozenParcels = parcels.map(parcel => ({ ...parcel }))
    const ids = [...new Set(frozenParcels.map(adapter.getId))]
    const candidates = compatibleJobs()
    let targetJob = jobId == null ? candidates[0] : jobs.value.find(item => Number(item.id) === Number(jobId))
    const reason = disabledReason(targetJob)
    if (reason) { alerts.error(reason); return false }
    confirming.value = true
    let summary = null
    let failure = null
    let failureMessage = null
    let refreshNeeded = false
    let requestInFlight = false
    try {
      const choice = reactive({ jobId: targetJob.id })
      if (bulk && !await confirm({ title: adapter.title,
        contentComponent: markRaw(adapter.confirmation),
        contentComponentProps: {
          count: ids.length,
          jobs: (jobId == null ? candidates : [targetJob]).map(item => ({ id: item.id, label: jobLabel(item) })),
          choice, onSelectJob: id => { choice.jobId = id }
        },
        confirmationText: 'Отметить как отсканированные', cancellationText: 'Отмена',
        confirmationButtonProps: APP_DIALOG_BUTTON_PROPS.primary })) return false
      if (!current()) return false
      targetJob = candidates.find(item => Number(item.id) === Number(choice.jobId))
      jobId = targetJob.id
      const lookup = Number(targetJob.operation) === constants.value.lookupOperation
      busy.value = true
      confirming.value = false
      refreshNeeded = true
      pendingBatch.value = { jobId, parcels: frozenParcels, uncertain: false }
      if (toValue(disabled) || !canScan.value) throw new Error('Операция остановлена')
      onRecoveryFeedback?.(null)
      requestInFlight = true
      const response = bulk
        ? await store[adapter.batchMethod](jobId, ids)
        : { completed: [await store[adapter.scanMethod](jobId, ids[0])], skippedIds: [] }
      requestInFlight = false
      if (!current()) return false
      const { completed, skippedIds } = response
      if (skippedIds.length) {
        failureMessage = `Не удалось отсканировать позиции, которых нет в партии задания: ${skippedIds.map(id => `#${id}`).join(', ')}.`
      } else if (completed.length === 1 && onRecoveryFeedback &&
          (completed[0].recoveryBoxAdvice || completed[0].recoveryConfirmed)) {
        if (failureAlertId != null) {
          alerts.dismiss(failureAlertId)
          failureAlertId = null
        }
        onRecoveryFeedback(completed[0])
      } else if (completed.some(result => result.recoveryConfirmed)) {
        const recovered = completed.filter(result => result.recoveryConfirmed).length
        summary = { level: 'info', message: `Найдено при поиске: ${recovered}` }
      } else {
        const matches = lookup ? completed.filter(result => result.count > 0) : []
        const empty = completed.filter(adapter.isEmpty).length
        const matchedParcels = matches.reduce((sum, result) => sum + result.count, 0)
        summary = {
          level: empty ? 'warning' : matches.length ? 'info' : 'success',
          message: adapter.successMessage({ completed: completed.length, matched: matches.length, lookup, empty, matchedParcels })
        }
      }
      completedScanCodes = new Set(completed.map(item => item.scanCodeId).filter(Number.isInteger))
      if (bulk) completedBatchIds.value = completed.map(item => item.id)
      pendingBatch.value = null
    } catch (error) {
      failure = error
      const uncertain = requestInFlight && !error.knownOutcome && (!error.status || error.status >= 500)
      if (current()) {
        uncertainOutcome.value = uncertain
        pendingBatch.value = { jobId, parcels: frozenParcels, uncertain }
        const context = bulk ? 'Не удалось отсканировать выбранные позиции' : `Не удалось выполнить сканирование на ${adapter.failureEntity} #${ids[0]}`
        const message = `${context}. ${getErrorMessage(error)}`
        failureMessage = uncertain ? `${message} Результат запроса не подтверждён. Обновите страницу и ${adapter.checkEntity} перед повтором.` : message
      } else reportError(error, { context: 'manual scan after scope change' })
    } finally {
      if (current() && refreshNeeded) {
        // Refresh failures must not replace the scan error or offer another scan.
        try {
          await refresh()
          if (summary && current()) alerts[summary.level](summary.message)
        }
        catch (error) {
          if (failureMessage || !current()) reportError(error, { context: 'manual scan failure refresh' })
          else failureAlertId = alerts.error(error, { fallback: 'Не удалось обновить данные после сканирования. Обновите страницу.' })
        }
      }
      busy.value = false
      confirming.value = false
      if (failureMessage) {
        if (current()) failureAlertId = alerts.error(failureMessage)
        else if (failure) reportError(failure, { context: 'manual scan after scope change' })
      }
    }
    return !failure
  }

  function invalidateBatch() {
    version++
    pendingBatch.value = null
  }

  watch(() => [toValue(registerId), toValue(scopeKey)], () => {
    invalidateBatch()
    if (!job) { activeJobs.value = []; void refreshJobs() }
  }, { flush: 'sync' })

  onMounted(() => loadJobDefinitions())
  onMounted(async () => {
    if (job) return
    try {
      await listChannel.start({ onChanged: refreshJobs, onClosed: error => {
        if (mounted && error) alerts.error(error, { fallback: 'Соединение с заданиями сканирования прервано' })
      } })
      if (!mounted) { await listChannel.stop(); return }
    } catch (error) {
      if (mounted) alerts.error(error, { fallback: 'Не удалось подключиться к обновлениям заданий сканирования' })
      else reportError(error, { context: 'manual scan startup cleanup' })
    }
    if (mounted) await refreshJobs()
  })
  onUnmounted(() => {
    mounted = false
    version++
    if (listChannel) listChannel.stop().catch(error => reportError(error, { context: 'manual scan jobs cleanup' }))
  })

  const context = { target: scanTarget, jobs, jobsLoading, busy, locked, pendingBatch, completedBatchIds, run, disabledReason, invalidateBatch, canScan, compatibleJobs,
    includesCompletedScan: scanCodeId => completedScanCodes.has(scanCodeId),
    jobLabel,
    scopeKey: computed(() => toValue(scopeKey)),
    disabled: computed(() => toValue(disabled) || uncertainOutcome.value) }
  provide(MANUAL_SCAN_KEY, context)
  return context
}
