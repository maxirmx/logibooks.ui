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

export function getCorrectedWeight(weight, register) {
  const normalize = (value) => (
    typeof value === 'string' ? value.trim().replace(/\u00A0|\s/g, '') : value
  )

  const weightValue = parseWeightCorrectionValue(normalize(weight))
  if (weightValue === null) return null

  const correction = getWeightCorrection(register == null ? null : {
    realWeightKg: normalize(register.realWeightKg),
    totalWeightKgToRelease: normalize(register.totalWeightKgToRelease)
  })

  return correction.canCorrect ? weightValue * correction.coefficient : null
}

export function buildWeightCorrectionMessage(coefficientText, { singleParcel = false } = {}) {
  const parcelText = singleParcel ? 'посылки' : 'посылок'
  return `Применить поправочный коэффициент ${coefficientText} для веса ${parcelText}?`
}

export async function chooseOutputWeightCorrection(confirm, register, options = {}) {
  const correction = getWeightCorrection(register)
  if (!correction.canCorrect) return WEIGHT_CORRECTION_CHOICE.Skip

  const applyWeightCorrection = await confirm({
    title: 'Подтверждение',
    confirmationText: 'Да',
    cancellationText: 'Нет',
    dialogProps: WEIGHT_CORRECTION_CONFIRM_DIALOG_PROPS,
    confirmationButtonProps: WEIGHT_CORRECTION_CONFIRM_BUTTON_PROPS,
    content: buildWeightCorrectionMessage(correction.coefficientText, options)
  })

  return applyWeightCorrection ? WEIGHT_CORRECTION_CHOICE.Apply : WEIGHT_CORRECTION_CHOICE.Skip
}

export async function confirmOutputWeightCorrection(confirm, register, options = {}) {
  return (await chooseOutputWeightCorrection(confirm, register, options)) === WEIGHT_CORRECTION_CHOICE.Apply
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
