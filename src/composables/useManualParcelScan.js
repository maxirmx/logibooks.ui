// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.

import { computed, markRaw, onMounted, onUnmounted, provide, reactive, ref, toValue, watch } from 'vue'
import ParcelScanConfirmationContent from '@/components/ParcelScanConfirmationContent.vue'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { APP_DIALOG_BUTTON_PROPS } from '@/helpers/dialog.helpers.js'
import { getErrorMessage, reportError } from '@/helpers/error.helpers.js'
import { MANUAL_PARCEL_SCAN_KEY,
  parcelScanDisabledReason, parcelScanId, parcelScanSuccessMessage } from '@/helpers/parcel.scan.helpers.js'

export function useManualParcelScan({ registerId, job = null, disabled = false,
  scopeKey = null, refresh, onScanned = () => {} }) {
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
  const progress = ref(null)
  const pendingBatch = ref(null)
  const uncertainOutcome = ref(false)
  const completedIds = ref([])
  const constants = computed(() => {
    const values = store.ops.constants
    return values && [values.inProgressStatus, values.boxOnlyType, values.lookupOperation].every(Number.isInteger) ? values : null
  })
  const jobs = computed(() => (job ? [toValue(job)] : activeJobs.value)
    .filter(candidate => candidate && constants.value && Number(candidate.status) === constants.value.inProgressStatus))
  const canScan = computed(() => [auth.isAdmin, auth.isWhManager, auth.isWhOperator].some(value => Boolean(toValue(value))))
  let mounted = true
  let version = 0
  let jobsVersion = 0

  function disabledReason(candidate) {
    return parcelScanDisabledReason(candidate, constants.value)
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
    const runVersion = version
    const current = () => mounted && runVersion === version
    const frozenParcels = parcels.map(parcel => ({ ...parcel }))
    const candidates = compatibleJobs()
    let targetJob = jobId == null ? candidates[0] : jobs.value.find(item => Number(item.id) === Number(jobId))
    const reason = disabledReason(targetJob)
    if (reason) { alerts.error(reason); return false }
    confirming.value = true
    let completed = 0
    let matched = 0
    let lookup = false
    let failure = null
    let failureMessage = null
    let refreshNeeded = false
    let requestInFlight = false
    try {
      const choice = reactive({ jobId: targetJob.id })
      if (bulk && !await confirm({ title: 'Сканирование посылок',
        contentComponent: markRaw(ParcelScanConfirmationContent),
        contentComponentProps: {
          count: frozenParcels.length,
          jobs: (jobId == null ? candidates : [targetJob]).map(item => ({ id: item.id, label: jobLabel(item) })),
          choice, onSelectJob: id => { choice.jobId = id }
        },
        confirmationText: 'Отметить как отсканированные', cancellationText: 'Отмена',
        confirmationButtonProps: APP_DIALOG_BUTTON_PROPS.primary })) return false
      if (!current()) return false
      targetJob = candidates.find(item => Number(item.id) === Number(choice.jobId))
      jobId = targetJob.id
      lookup = Number(targetJob.operation) === constants.value.lookupOperation
      busy.value = true
      confirming.value = false
      refreshNeeded = true
      pendingBatch.value = { jobId, parcels: frozenParcels, uncertain: false }
      completedIds.value = []
      progress.value = { completed: 0, total: frozenParcels.length }
      for (const parcel of frozenParcels) {
        if (!current()) return false
        if (toValue(disabled) || !canScan.value) throw Object.assign(new Error('Операция остановлена'), { knownOutcome: true })
        const id = parcelScanId(parcel)
        requestInFlight = true
        // Like the scanner, accept a completed request even when Lookup finds no match.
        const result = await store.scanParcel(jobId, id)
        requestInFlight = false
        if (!current()) return false
        if (lookup && result?.count > 0) matched++
        completed++
        onScanned(id)
        completedIds.value = [...completedIds.value, id]
        pendingBatch.value.parcels = frozenParcels.slice(completed)
        progress.value.completed = completed
      }
      pendingBatch.value = null
    } catch (error) {
      failure = error
      const uncertain = requestInFlight && !error.knownOutcome && (!error.status || error.status >= 500)
      if (current()) {
        uncertainOutcome.value = uncertain
        pendingBatch.value = { jobId, parcels: frozenParcels.slice(completed), uncertain }
        const failedId = parcelScanId(frozenParcels[completed])
        const message = `Сканирование остановлено на посылке #${failedId}. Отсканировано: ${completed} из ${frozenParcels.length}. ${getErrorMessage(error)}`
        failureMessage = uncertain ? `${message} Результат запроса не подтверждён. Обновите страницу и проверьте посылку перед повтором.` : message
      } else reportError(error, { context: 'manual scan after scope change' })
    } finally {
      if (current() && refreshNeeded) {
        // Refresh failures must not replace the scan error or offer another scan.
        try {
          await refresh()
          if (!failure && current()) {
            alerts[matched > 0 ? 'info' : 'success'](parcelScanSuccessMessage({ completed, matched, lookup }))
          }
        }
        catch (error) {
          if (failure || !current()) reportError(error, { context: 'manual scan failure refresh' })
          else alerts.error(error, { fallback: 'Не удалось обновить данные после сканирования. Обновите страницу.' })
        }
      }
      busy.value = false
      confirming.value = false
      progress.value = null
      if (failureMessage) {
        if (current()) alerts.error(failureMessage)
        else reportError(failure, { context: 'manual scan after scope change' })
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

  const context = { jobs, jobsLoading, busy, locked, progress, pendingBatch, completedIds, run, disabledReason, invalidateBatch, canScan, compatibleJobs,
    jobLabel,
    scopeKey: computed(() => toValue(scopeKey)),
    disabled: computed(() => toValue(disabled) || uncertainOutcome.value) }
  provide(MANUAL_PARCEL_SCAN_KEY, context)
  return context
}
