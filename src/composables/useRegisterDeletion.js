// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { getCurrentScope } from 'vue'
import { useActionDialog } from '@/composables/useActionDialog.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { reportError } from '@/helpers/error.helpers.js'
import { getRegisterNouns } from '@/helpers/op.mode.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'

export function useRegisterDeletion({ mode, runningAction, reloadRegisters }) {
  const scope = getCurrentScope()
  const alertStore = useAlertStore()
  const authStore = useAuthStore()
  const registersStore = useRegistersStore()
  const confirm = useAppConfirm()
  const nouns = getRegisterNouns(mode)
  const { actionDialogState: deleteDialog, showActionDialog, hideActionDialog } = useActionDialog()

  async function deleteRegister(register) {
    if (runningAction.value) return false

    const userId = authStore.user?.id
    const isCurrentPage = () => scope.active && authStore.user?.id === userId
    runningAction.value = true

    try {
      const confirmed = await confirm({
        title: 'Подтверждение',
        confirmationText: 'Удалить',
        cancellationText: 'Не удалять',
        content: `Удалить ${nouns.accusative} «${register.fileName}»?`
      })

      if (!confirmed || !isCurrentPage()) return false

      showActionDialog('delete-register', `Удаление ${nouns.genitiveSingular}`)
      await registersStore.remove(register.id)
      if (!isCurrentPage()) return false

      return await reloadRegisters()
    } catch (error) {
      if (isCurrentPage()) {
        alertStore.error(error, { fallback: `Ошибка при удалении ${nouns.genitiveSingular}` })
      } else {
        reportError(error, { context: 'register deletion after its scope changed' })
      }
      return false
    } finally {
      hideActionDialog()
      runningAction.value = false
    }
  }

  return { deleteDialog, deleteRegister }
}
