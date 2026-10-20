// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { markRaw, reactive } from 'vue'
import ScanjobFinishConfirmationContent from '@/components/ScanjobFinishConfirmationContent.vue'

export function useScanjobFinishConfirmation(getFinishOptions, confirm) {
  let pending = null

  function reset() {
    pending = null
  }

  async function request({ id, name, operation }) {
    const options = await getFinishOptions(id, { operation })
    if (!pending || pending.id !== id || pending.operation !== operation) {
      pending = { id, operation, choices: reactive({
        markUnscannedAsNotFound: true,
        updateRegisterStatus: true
      }) }
    }
    const choices = pending.choices
    choices.markUnscannedAsNotFound = choices.markUnscannedAsNotFound && options.canMarkUnscannedAsNotFound
    choices.updateRegisterStatus = choices.updateRegisterStatus && options.targetRegisterStatus !== null

    const hasChoices = options.canMarkUnscannedAsNotFound || options.targetRegisterStatus !== null
    const accepted = await confirm({
      title: String(name),
      size: hasChoices ? 'medium' : 'small',
      confirmationText: 'Завершить задание',
      cancellationText: 'Отмена',
      ...(hasChoices ? {
        contentComponent: markRaw(ScanjobFinishConfirmationContent),
        contentComponentProps: {
          options,
          choices,
          onChange: (field, value) => { choices[field] = value }
        }
      } : { content: 'Завершить задание?' })
    })
    if (!accepted) {
      reset()
      return null
    }
    return { ...choices }
  }

  return { request, reset }
}
