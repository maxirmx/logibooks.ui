// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { computed, shallowRef, unref } from 'vue'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'

export function useScanjobHeading(scanjobId, options = {}) {
  const scanjobsStore = useScanjobsStore()
  const loadedJob = shallowRef(null)
  const scanjobHeading = computed(() =>
    Number(loadedJob.value?.id) === Number(unref(scanjobId)) ? loadedJob.value.name ?? '' : ''
  )

  async function loadScanjob() {
    loadedJob.value = null
    const id = unref(scanjobId)
    const loaded = await scanjobsStore.getById(id)
    if (id === unref(scanjobId) && (!options.isComponentMounted || options.isComponentMounted.value)) {
      loadedJob.value = loaded
    }
    return loaded
  }

  return {
    scanjobHeading,
    loadScanjob
  }
}
