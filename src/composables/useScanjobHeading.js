// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { computed, ref, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'

export function useScanjobHeading(scanjobId, options = {}) {
  const scanjobsStore = useScanjobsStore()
  const alertStore = useAlertStore()
  const { scanjob } = storeToRefs(scanjobsStore)

  const scanjobLoading = ref(true)

  const isActive = () => !options.isComponentMounted || options.isComponentMounted.value

  const scanjobHeading = computed(() => {
    if (scanjobLoading.value) return 'Загрузка задания на сканирование...'
    if (scanjob.value?.name) return `${scanjob.value.name}`
    return 'Результаты сканирования'
  })

  async function loadScanjob() {
    if (isActive()) {
      scanjobLoading.value = true
    }

    try {
      const loaded = await scanjobsStore.getById(unref(scanjobId))
      if (!loaded && isActive()) {
        alertStore.error('Не удалось загрузить задание на сканирование')
      }
      return loaded
    } catch {
      if (isActive()) {
        alertStore.error('Ошибка при загрузке данных')
      }
      return null
    } finally {
      if (isActive()) {
        scanjobLoading.value = false
      }
    }
  }

  return {
    scanjobHeading,
    scanjobLoading,
    loadScanjob
  }
}
