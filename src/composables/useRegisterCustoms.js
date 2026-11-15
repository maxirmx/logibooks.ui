// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onScopeDispose, ref, watch } from 'vue'
import { apiUrl } from '@/helpers/config.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { reportError } from '@/helpers/error.helpers.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'

export function useRegisterCustoms(registerId, decId = ref(null)) {
  const auth = useAuthStore()
  const alerts = useAlertStore()
  const registers = useRegistersStore()
  const confirm = useAppConfirm()
  const summary = ref(null)
  const summaryLoading = ref(false)
  const deleting = ref(false)
  const base = computed(() => apiUrl + '/registers/' + registerId.value)
  let scope = 0
  let summaryRequest = 0
  let action = 0

  watch([registerId, () => auth.user?.id], () => {
    scope++
    summary.value = null
    summaryLoading.value = false
  }, { flush: 'sync' })

  watch([registerId, decId, () => auth.user?.id], () => {
    action++
    deleting.value = false
  }, { flush: 'sync' })

  onScopeDispose(() => { scope++; action++ })

  async function loadSummary() {
    const key = scope
    const request = ++summaryRequest
    summaryLoading.value = true
    try {
      const [data] = await Promise.all([
        fetchWrapper.get(base.value + '/decs'),
        registers.ensureOpsLoaded()
      ])
      if (key === scope && request === summaryRequest) summary.value = data
    } catch (error) {
      if (key === scope && request === summaryRequest) {
        alerts.error(error, { fallback: 'Не удалось загрузить ДТЭГ/ПТДЭГ реестра' })
      } else {
        reportError(error, { context: 'register customs summary after scope change' })
      }
    } finally {
      if (key === scope && request === summaryRequest) summaryLoading.value = false
    }
  }

  async function getDecisions(filter) {
    const params = new URLSearchParams(filter)
    if (decId.value) params.set('decId', decId.value)
    return fetchWrapper.get(base.value + '/customs-decisions?' + params)
  }

  async function remove({ decision, dec, refresh, canSubmit = () => true }) {
    if (deleting.value || !auth.isShiftLeadPlus || summary.value?.register?.readOnly !== false) return
    const key = ++action
    const ownsAction = () => action === key
    const endpoint = decision
      ? '/customs-decisions/' + decision.id
      : dec ? '/decs/' + dec.id + '/customs-decisions' : '/customs-decisions'
    const target = decision
      ? 'решение №' + decision.id
      : dec ? 'все решения по ДТЭГ/ПТДЭГ «' + dec.number + '»'
        : 'все решения реестра «' + (summary.value.register.dealNumber || registerId.value) + '»'
    deleting.value = true
    try {
      const approved = await confirm({
        title: 'Подтверждение',
        confirmationText: 'Удалить',
        cancellationText: 'Не удалять',
        content: 'Удалить ' + target + '? ' + (decision ? '' : 'Удаление охватывает все страницы. ') +
          'Информация о ДТЭГ/ПТДЭГ будет удалена.'
      })
      if (!approved || !ownsAction() || !canSubmit() ||
        !auth.isShiftLeadPlus || summary.value?.register?.readOnly !== false) return
      await fetchWrapper.delete(base.value + endpoint)
      if (ownsAction()) await Promise.all([loadSummary(), refresh?.()])
    } catch (error) {
      if (ownsAction()) alerts.error(error, { fallback: 'Не удалось удалить решения о выпуске' })
      else reportError(error, { context: 'customs decision deletion after scope change' })
    } finally {
      if (ownsAction()) deleting.value = false
    }
  }

  watch([registerId, () => auth.user?.id], loadSummary, { immediate: true })
  return { summary, summaryLoading, deleting, getDecisions, remove }
}
