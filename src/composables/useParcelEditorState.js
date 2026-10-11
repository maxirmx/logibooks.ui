// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onBeforeUnmount, onMounted, ref, toRaw, toValue } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelViewsStore } from '@/stores/parcel.views.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { reportError } from '@/helpers/error.helpers.js'

export function useParcelEditorState({ parcelId, formRef, loadDependencies, onReady }) {
  const parcelsStore = useParcelsStore()
  const parcelViewsStore = useParcelViewsStore()
  const alertStore = useAlertStore()
  const phase = ref('loading')
  const ready = computed(() => phase.value === 'ready')
  let active = true
  let version = 0
  let historyAttempt = null
  let recordedVersion = null

  function isCurrent(attemptVersion, id) {
    return active && version === attemptVersion && Number(toValue(parcelId)) === id
  }

  function recordView(attemptVersion, id) {
    if (!isCurrent(attemptVersion, id)) return Promise.resolve(false)
    if (recordedVersion === attemptVersion) return Promise.resolve(true)
    if (historyAttempt?.version === attemptVersion) return historyAttempt.promise

    const attempt = { version: attemptVersion, promise: null }
    attempt.promise = Promise.resolve().then(async () => {
      try {
        if (!isCurrent(attemptVersion, id)) return false
        await parcelViewsStore.add(id)
        if (isCurrent(attemptVersion, id)) recordedVersion = attemptVersion
        return true
      } catch (error) {
        if (isCurrent(attemptVersion, id)) {
          alertStore.error(error, {
            fallback: 'Не удалось сохранить историю просмотра посылки',
            action: { label: 'Повторить', handler: () => recordView(attemptVersion, id) }
          })
        } else {
          // A history request can finish after leaving the editor; do not notify the new page.
          reportError(error, { context: 'parcel view history after editor disposal or replacement' })
        }
        return false
      } finally {
        if (historyAttempt === attempt) historyAttempt = null
      }
    })
    historyAttempt = attempt
    return attempt.promise
  }

  async function initialize() {
    if (!active) return false
    const attemptVersion = ++version
    const id = Number(toValue(parcelId))
    phase.value = 'loading'
    try {
      await loadDependencies()
      if (!isCurrent(attemptVersion, id)) return false
      const parcel = await parcelsStore.getById(id)
      if (!isCurrent(attemptVersion, id)) return false
      if (!parcel || Number(parcel.id) !== id) {
        throw new Error('Сервер вернул некорректные данные посылки')
      }

      // Seed from this request's result, never from the shared item another request can replace.
      formRef.value.resetForm({ values: globalThis.structuredClone(toRaw(parcel)) }, { force: true })
      phase.value = 'ready'
      onReady(parcel)
      // recordView handles its failures independently; history must not delay the usable form.
      void recordView(attemptVersion, id)
      return true
    } catch (error) {
      if (isCurrent(attemptVersion, id)) {
        phase.value = 'error'
        alertStore.error(error, {
          fallback: 'Не удалось загрузить информацию о посылке',
          action: { label: 'Повторить', handler: initialize }
        })
      } else {
        // Superseded initialization must not replace the destination page's message.
        reportError(error, { context: 'parcel initialization after editor disposal or replacement' })
      }
      return false
    }
  }

  onMounted(initialize)
  onBeforeUnmount(() => {
    active = false
    ++version
  })

  return { phase, ready, initialize }
}
