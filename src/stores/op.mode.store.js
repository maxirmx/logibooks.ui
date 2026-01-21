// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'

export const OP_MODE_PAPERWORK = 'modePaperwork'
export const OP_MODE_WAREHOUSE = 'modeWarehouse'

const MODE_LABELS = {
  [OP_MODE_PAPERWORK]: 'Режим "Оформление"',
  [OP_MODE_WAREHOUSE]: 'Режим "Склад"'
}

export const useOpModeStore = defineStore('opMode', {
  state: () => ({
    globalOpMode: OP_MODE_PAPERWORK
  }),
  getters: {
    modeLabel: (state) => MODE_LABELS[state.globalOpMode] || MODE_LABELS[OP_MODE_PAPERWORK]
  },
  actions: {
    setMode(mode) {
      if (!MODE_LABELS[mode]) return
      this.globalOpMode = mode
    },
    toggleMode() {
      this.globalOpMode =
        this.globalOpMode === OP_MODE_PAPERWORK ? OP_MODE_WAREHOUSE : OP_MODE_PAPERWORK
    }
  },
  persist: {
    key: 'logibooks-global-op-mode',
    paths: ['globalOpMode']
  }
})
