// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, reactive, watch } from 'vue'
import { canSplitRegister } from '@/helpers/register.reconciliation.helpers.js'
import { reportError } from '@/helpers/error.helpers.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'

export function useRegisterSplit({ store, authStore, alertStore, register, busy, runningAction, mounted,
  refreshRegister, registerId = () => register()?.id, makeId = () => globalThis.crypto.randomUUID(),
  storage = globalThis.sessionStorage, confirm = useAppConfirm() }) {
  const state = reactive({ phase: 'idle', progress: { show: false, title: 'Разделение реестра', percent: null },
    result: null, summaryVisible: false, refreshFailed: false, canCancel: false, cancelling: false })
  const locked = computed(() => ['working', 'recovery', 'unknown'].includes(state.phase))
  let operation = null
  let timer = null
  let pollingVersion = 0
  let stopped = false
  const userId = () => authStore.user?.id
  const key = (id = registerId(), user = userId()) => `register-split:${user}:${id}`
  const alive = candidate => !stopped && mounted.value && operation === candidate &&
    candidate?.registerId === registerId() && candidate?.userId === userId()
  function setPhase(phase) {
    const wasLocked = locked.value
    state.phase = phase
    if (phase !== 'working') state.canCancel = false
    if (phase === 'idle') state.cancelling = false
    if (locked.value || wasLocked) runningAction.value = locked.value
  }
  function stopTimer() { clearTimeout(timer); timer = null; pollingVersion++ }
  function persist(value) {
    try {
      if (value) storage?.setItem(key(value.registerId, value.userId), JSON.stringify(value))
      else if (operation) storage?.removeItem(key(operation.registerId, operation.userId))
    } catch (error) { reportError(error, { context: 'split recovery storage' }) }
  }
  function clearOperation() { persist(null); operation = null; setPhase('idle') }
  function failed(error, candidate, starting, fallback = 'Не удалось получить результат разделения реестра. Проверьте результат операции') {
    if (!alive(candidate)) {
      // Navigation aborts are expected; other late failures still need diagnostics.
      if (error?.name !== 'AbortError') reportError(error, { context: 'split after navigation' })
      return
    }
    stopTimer()
    state.progress.show = false
    if (['RegisterSplitOperationUnavailable', 'RegisterSplitOutcomeUnknown'].includes(error?.data?.code)) setPhase('unknown')
    else if (error?.data?.details?.finished || starting && error?.status >= 400 && error.status < 500) clearOperation()
    else setPhase('recovery')
    alertStore.error(error, { fallback })
  }
  async function refresh() {
    const currentId = registerId()
    state.refreshFailed = false
    try { await refreshRegister() }
    catch (error) {
      if (!stopped && mounted.value && currentId === registerId()) {
        state.refreshFailed = true
        alertStore.error(error, { fallback: 'Разделение выполнено, но не удалось обновить данные реестра' })
      } else reportError(error, { context: 'split refresh after navigation' })
    }
  }
  async function acceptProgress(progress, candidate) {
    if (!alive(candidate)) return true
    state.progress.percent = Number.isFinite(progress.percent) ? Math.max(0, Math.min(99, progress.percent)) : null
    state.canCancel = !progress.finished
    state.cancelling ||= Boolean(progress.cancellationRequested)
    if (progress.finished && (progress.phase === 'cancelled' || progress.result)) {
      stopTimer()
      state.progress.show = false
      state.result = progress.result ?? null
      state.summaryVisible = Boolean(progress.result)
      clearOperation()
      if (progress.result) await refresh()
      return true
    }
    return false
  }
  async function poll(candidate = operation) {
    if (!alive(candidate)) return
    const version = pollingVersion
    setPhase('working')
    state.progress.show = true
    try {
      const progress = await store.getSplit(candidate.registerId, candidate.id)
      if (version !== pollingVersion) return
      if (!await acceptProgress(progress, candidate) && alive(candidate)) {
        timer = setTimeout(() => {
          poll(candidate).catch(error => reportError(error, { context: 'split polling callback' }))
        }, 1000)
      }
    } catch (error) {
      // A cancellation request supersedes any outstanding progress read.
      if (version !== pollingVersion && alive(candidate)) reportError(error, { context: 'superseded split polling' })
      else failed(error, candidate, false)
    }
  }
  async function cancel() {
    const candidate = operation
    if (!alive(candidate) || !state.canCancel || state.cancelling) return false
    state.cancelling = true
    stopTimer()
    try {
      const progress = await store.cancelSplit(candidate.registerId, candidate.id)
      if (!await acceptProgress(progress, candidate) && alive(candidate)) await poll(candidate)
    } catch (error) {
      if (alive(candidate)) state.cancelling = false
      failed(error, candidate, false, 'Не удалось отменить разделение реестра. Проверьте состояние операции')
    }
    return true
  }
  async function start() {
    if (locked.value || busy() || register()?.readOnly || register()?.id !== registerId() ||
      !canSplitRegister(register(), authStore.isSrLogistPlus)) return false
    operation = { id: makeId(), registerId: registerId(), userId: userId() }
    const candidate = operation
    persist(candidate)
    state.result = null
    state.summaryVisible = false
    state.refreshFailed = false
    state.progress.percent = null
    state.progress.show = true
    setPhase('working')
    try {
      await store.startSplit(candidate.registerId, candidate.id)
      if (alive(candidate)) { state.canCancel = true; await poll(candidate) }
    } catch (error) { failed(error, candidate, true) }
    return true
  }
  async function retry() { if (state.phase === 'recovery') await poll(operation) }
  async function acknowledgeUnknown() {
    const candidate = operation
    try {
      if (state.phase !== 'unknown' || !await confirm({ title: 'Результат разделения неизвестен',
        text: 'Реестры могли быть созданы. Проверьте список реестров перед новым разделением. Разрешить новый запуск?',
        confirmationText: 'Разрешить новое разделение', cancellationText: 'Отмена' })) return
      if (!alive(candidate)) return
      clearOperation()
    } catch (error) {
      alertStore.error(error, { fallback: 'Не удалось подтвердить повторное разделение реестра' })
    }
  }
  function resume() {
    if (stopped || !mounted.value || operation) return
    try {
      const saved = JSON.parse(storage?.getItem(key()) ?? 'null')
      if (!saved || typeof saved.id !== 'string' || !saved.id || saved.registerId !== registerId() || saved.userId !== userId()) return
      operation = saved
      poll(saved).catch(error => reportError(error, { context: 'resume split polling' }))
    } catch (error) { reportError(error, { context: 'restore split operation' }) }
  }
  watch([registerId, userId], () => {
    stopTimer()
    state.progress.show = false
    state.summaryVisible = false
    state.result = null
    operation = null
    setPhase('idle')
    resume()
  }, { flush: 'sync' })
  onMounted(resume)
  function stop() { stopped = true; stopTimer(); state.progress.show = false; setPhase('idle') }
  return { state, locked, start, cancel, retry, acknowledgeUnknown, refresh, stop }
}