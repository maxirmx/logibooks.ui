/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive } from 'vue'
import { useRegisterHeaderActions } from '@/helpers/register.actions.js'
const confirmMock = vi.hoisted(() => vi.fn())

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

describe('Technical Documentation Download Feature', () => {
  let registersStore
  let alertStore
  let runningAction
  let tableLoading
  let registerLoading
  let loadParcels
  let isComponentMounted

  beforeEach(() => {
    registersStore = {
      item: reactive({
        id: 123,
        invoiceNumber: 'INV-2025-001',
        fileName: 'register_123.xlsx',
        loading: false,
        error: null
      }),
      downloadTechdoc: vi.fn().mockResolvedValue(),
      getAll: vi.fn().mockResolvedValue()
    }

    alertStore = { error: vi.fn() }
    runningAction = ref(false)
    tableLoading = ref(false)
    registerLoading = ref(false)
    loadParcels = vi.fn().mockResolvedValue()
    isComponentMounted = ref(true)
  })

  describe('useRegisterHeaderActions', () => {
    it('should report errors and hide action dialog when techdoc download fails', async () => {
      const error = new Error('Download failed')
      registersStore.downloadTechdoc.mockRejectedValueOnce(error)

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadParcels,
        isComponentMounted
      })

      const { actionDialog, downloadTechdoc } = actions

      const promise = downloadTechdoc()

      expect(actionDialog.show).toBe(true)

      await expect(promise).resolves.toBeUndefined()

      expect(actionDialog.show).toBe(false)
      expect(actionDialog.title).toBe('')
      expect(alertStore.error).toHaveBeenCalledWith('Download failed')
    })

  })

})
