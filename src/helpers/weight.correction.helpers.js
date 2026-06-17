// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { reactive } from 'vue'

export const WEIGHT_CORRECTION_CHOICE = {
  Apply: 'apply',
  Skip: 'skip',
  Cancel: 'cancel'
}

export const WEIGHT_CORRECTION_CONFIRM_DIALOG_PROPS = {
  width: '30%',
  minWidth: '250px'
}

export const WEIGHT_CORRECTION_CONFIRM_BUTTON_PROPS = {
  color: 'orange-darken-3'
}

export function parseWeightCorrectionValue(value) {
  if (value === null || value === undefined || value === '') return null

  const normalized = String(value).trim().replace(',', '.')
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function getWeightCorrection(register) {
  const realWeightKg = parseWeightCorrectionValue(register?.realWeightKg)
  const weightToRelease = parseWeightCorrectionValue(register?.totalWeightKgToRelease)

  if (realWeightKg === null || realWeightKg <= 0 || weightToRelease === null || weightToRelease <= 0) {
    return { canCorrect: false }
  }

  const coefficient = realWeightKg / weightToRelease
  return {
    canCorrect: true,
    coefficient,
    coefficientText: coefficient.toLocaleString('ru-RU', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    })
  }
}

export function buildWeightCorrectionMessage(coefficientText, { singleParcel = false } = {}) {
  const parcelText = singleParcel ? 'посылки' : 'посылок'
  return `К весу ${parcelText} будет применён поправочный коэффициент ${coefficientText}. Вы уверены?`
}

export function confirmOutputWeightCorrection(confirm, register, options = {}) {
  const correction = getWeightCorrection(register)
  if (!correction.canCorrect) return true

  return confirm({
    title: 'Подтверждение',
    confirmationText: 'Да',
    cancellationText: 'Нет',
    dialogProps: WEIGHT_CORRECTION_CONFIRM_DIALOG_PROPS,
    confirmationButtonProps: WEIGHT_CORRECTION_CONFIRM_BUTTON_PROPS,
    content: buildWeightCorrectionMessage(correction.coefficientText, options)
  })
}

export function useWeightCorrectionChoiceDialog() {
  const weightCorrectionDialogState = reactive({
    show: false,
    coefficientText: ''
  })

  let pendingResolve = null

  function requestWeightCorrectionChoice(register) {
    const correction = getWeightCorrection(register)
    if (!correction.canCorrect) {
      return Promise.resolve(WEIGHT_CORRECTION_CHOICE.Skip)
    }

    weightCorrectionDialogState.coefficientText = correction.coefficientText
    weightCorrectionDialogState.show = true

    return new Promise((resolve) => {
      pendingResolve = resolve
    })
  }

  function resolveWeightCorrectionChoice(choice) {
    weightCorrectionDialogState.show = false
    weightCorrectionDialogState.coefficientText = ''

    if (pendingResolve) {
      pendingResolve(choice)
      pendingResolve = null
    }
  }

  return {
    weightCorrectionDialogState,
    requestWeightCorrectionChoice,
    resolveWeightCorrectionChoice
  }
}
