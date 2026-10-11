// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { createSessionListState } from '@/helpers/list.state.helpers.js'
import { reportError } from '@/helpers/error.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'

export const useListStateStore = defineStore('listState', () => {
  const session = createSessionListState((error, retry) => {
    reportError(error, { context: 'list state persistence' })
    useAlertStore().error('Не удалось сохранить или восстановить настройки списков', {
      action: { label: 'Повторить', handler: retry }
    })
  })
  return { setUser: session.setUser, bind: session.bind, persist: session.persist }
})
