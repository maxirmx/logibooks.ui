import { computed, reactive, ref, watch } from 'vue'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { getErrorMessage, reportError } from '@/helpers/error.helpers.js'
import { canReconcileRegister } from '@/helpers/register.reconciliation.helpers.js'
import { EXCEL_FILE_ACCEPT, openExcelFilePicker, takeSelectedExcelFile } from '@/helpers/excel.file.helpers.js'

export function useRegisterReconciliation({ store, authStore, alertStore, register, busy,
  runningAction, mounted, refreshRegister, refreshParcels, registerId = () => register()?.id, confirm = useAppConfirm(),
  makeId = () => globalThis.crypto.randomUUID() }) {
  const fileInput = ref(null)
  const state = reactive({ phase: 'idle', progress: { show: false, title: 'Сверка реестра', percent: 0 },
    error: { show: false, message: '' }, result: null, summaryVisible: false, refreshFailed: false })
  const locked = computed(() => ['working', 'retry-start', 'retry-status', 'unknown'].includes(state.phase))
  let operation = null
  let timer = null
  let stopped = false

  const alive = (candidate = operation) => !stopped && mounted.value && candidate != null &&
    operation === candidate && candidate.registerId === registerId()
  function setPhase(phase) {
    state.phase = phase
    runningAction.value = locked.value
  }
  function stopTimer() {
    clearTimeout(timer)
    timer = null
  }
  watch(registerId, currentId => {
    if (!operation || operation.registerId === currentId) return
    stopTimer()
    operation = null
    state.progress.show = false
    state.summaryVisible = false
    state.result = null
    state.error.show = false
    setPhase('idle')
  }, { flush: 'sync' })
  function openFile() {
    if (locked.value || busy() || register()?.readOnly || !canReconcileRegister(register(), authStore.isShiftLeadPlus)) return false
    return openExcelFilePicker(fileInput.value)
  }
  function showError(error, fileError = false) {
    const message = getErrorMessage(error, 'Не удалось выполнить сверку реестра')
    if (fileError) state.error = { show: true, message }
    else alertStore.error(error, { fallback: 'Не удалось выполнить сверку реестра' })
  }
  function failed(error, starting) {
    state.progress.show = false
    stopTimer()
    const data = error?.data
    if (error?.status === 404 || ['ReconciliationOutcomeUnknown', 'ReconciliationOperationNotFound'].includes(data?.code)) {
      setPhase('unknown')
      showError(error)
    } else if (data?.code === 'ReconciliationFailed' && data.details?.finished) {
      setPhase('idle')
      operation = null
      showError(error, data.details.failureKind === 'InvalidManifest')
    } else if (starting && error?.status >= 400 && error.status < 500) {
      if (data?.code === 'ReconciliationAlreadyRunning' && data.details?.activeHandle) {
        operation.id = data.details.activeHandle
        setPhase('retry-status')
      } else {
        operation = null
        setPhase('idle')
      }
      showError(error, error.status === 400)
    } else {
      setPhase(starting ? 'retry-start' : 'retry-status')
      showError(error)
    }
  }
  async function refresh() {
    const currentId = registerId()
    state.refreshFailed = false
    try {
      await refreshRegister()
      if (stopped || !mounted.value || registerId() !== currentId) return
      // The existing table loader owns presentation and returns false after handling its error.
      if (await refreshParcels() === false) state.refreshFailed = true
    } catch (error) {
      if (!stopped && mounted.value && registerId() === currentId) {
        state.refreshFailed = true
        alertStore.error(error, { fallback: 'Сверка выполнена, но не удалось обновить данные реестра' })
      } else reportError(error, { context: 'reconciliation refresh after disposal or route change' })
    }
  }
  async function poll(candidate = operation) {
    if (!alive(candidate)) return
    setPhase('working')
    state.progress.show = true
    try {
      const progress = await store.getReconciliation(candidate.registerId, candidate.id)
      if (!alive(candidate)) return
      state.progress.percent = progress.percent
      if (progress.finished && progress.result) {
        state.result = progress.result
        state.summaryVisible = true
        state.progress.show = false
        await refresh()
        if (alive(candidate)) {
          operation = null
          setPhase('idle')
        }
      } else {
        timer = setTimeout(() => {
          poll(candidate).catch(error => reportError(error, { context: 'reconciliation polling callback' }))
        }, 1000)
      }
    } catch (error) {
      if (alive(candidate)) failed(error, false)
      else reportError(error, { context: 'reconciliation polling after unmount' })
    }
  }
  async function start() {
    const candidate = operation
    if (!alive(candidate)) return
    setPhase('working')
    state.progress.show = true
    try {
      await store.startReconciliation(candidate.registerId, candidate.file, candidate.id)
      if (alive(candidate)) await poll(candidate)
    } catch (error) {
      if (alive(candidate)) failed(error, true)
      else reportError(error, { context: 'reconciliation start after unmount' })
    }
  }
  async function selectFile(event) {
    const file = takeSelectedExcelFile(event)
    if (!file || locked.value || busy() || register()?.readOnly || register()?.id !== registerId() || !canReconcileRegister(register(), authStore.isShiftLeadPlus)) return
    operation = { id: makeId(), file, registerId: registerId() }
    state.progress.percent = 0
    state.result = null
    state.summaryVisible = false
    state.error.show = false
    state.refreshFailed = false
    await start()
  }
  async function retry() {
    // A lost POST may already have committed. Even after expiry/restart, recovery must never resend it.
    if (state.phase === 'retry-start' || state.phase === 'retry-status') await poll()
  }
  async function acknowledgeUnknown() {
    try {
      if (!await confirm({ title: 'Результат сверки неизвестен', text: 'Изменения могли сохраниться. Проверьте реестр перед повторной сверкой. Начать новую сверку?',
        confirmationText: 'Начать новую сверку', cancellationText: 'Отмена' })) return
      if (stopped || !mounted.value) return
      operation = null
      setPhase('idle')
      openFile()
    } catch (error) { showError(error) }
  }
  function stop() {
    stopped = true
    stopTimer()
    state.progress.show = false
    runningAction.value = false
    // Server-side work deliberately continues; teardown never replays or cancels an import.
  }
  return { state, locked, fileInput, accept: EXCEL_FILE_ACCEPT, openFile, selectFile, retry, acknowledgeUnknown, refresh, stop }
}
