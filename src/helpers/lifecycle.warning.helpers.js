// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { isCustomsProcessingDisabled } from '@/helpers/parcel.statuses.helpers.js'
import { unref } from 'vue'

function parcelCountForm(count) {
  return count % 10 === 1 && count % 100 !== 11 ? 'посылки' : 'посылок'
}

export function buildCustomsExclusionWarning(statusTitle, count = 1) {
  return Number(count) === 1
    ? `Вы меняете статус посылки на «${statusTitle}». Эта посылка будет исключена из таможенного оформления, проверок и выгрузок.`
    : `Вы меняете статус посылок на «${statusTitle}». Эти посылки будут исключены из таможенного оформления, проверок и выгрузок.`
}

export function buildFinishPassportCheckWarning(notCheckedCount, inProgressCount) {
  const clauses = []
  if (Number(notCheckedCount) > 0) {
    clauses.push(`для ${notCheckedCount} ${parcelCountForm(notCheckedCount)} она не проводилась`)
  }
  if (Number(inProgressCount) > 0) {
    clauses.push(`для ${inProgressCount} ${parcelCountForm(inProgressCount)} она ещё выполняется`)
  }
  if (clauses.length === 0) return null

  return `Вы завершаете проверку паспортов, хотя ${clauses.join('; ')}. Целостность выгружаемых данных может быть нарушена.`
}

export function buildRestartPassportCheckWarning(parcelCount = 1) {
  const passport = Number(parcelCount) === 1 ? 'паспорта' : 'паспортов'
  return `Вы запрашиваете проверку ${passport}, хотя для данного реестра уже выполнялась операция «Завершить проверку паспортов». Перед выгрузкой накладных или реестра необходимо «Завершить проверку паспортов» ещё раз.`
}

export function buildClearPassportCheckWarning() {
  return 'Вы очищаете статус проверки паспорта, хотя для данного реестра уже выполнялась операция «Завершить проверку паспортов». Перед выгрузкой накладных или реестра необходимо «Завершить проверку паспортов» ещё раз.'
}

export function getStatusById(statusId, statusStore) {
  const id = Number(statusId)
  return typeof statusStore.getStatusById === 'function'
    ? statusStore.getStatusById(id)
    : statusStore.parcelStatuses?.find((status) => Number(status.id) === id)
}

export async function confirmCustomsExclusionStatusChange({
  values,
  currentParcel,
  statusStore,
  confirm,
  count = 1
}) {
  if (Number(values?.statusId) === Number(currentParcel?.statusId)) return true
  if (!isCustomsProcessingDisabled(values?.statusId, statusStore)) return true

  const status = getStatusById(values.statusId, statusStore)
  return confirm({
    title: 'Подтверждение',
    confirmationText: 'Применить',
    cancellationText: 'Отменить',
    content: buildCustomsExclusionWarning(status?.title || '', count)
  })
}

export async function confirmPassportCheckRestart({
  registerId,
  registersStore,
  confirm,
  parcelCount = 1,
  action = 'check'
}) {
  await registersStore.getById(Number(registerId))
  if (unref(registersStore.item)?.passportCheckWasFinished !== true) return true

  return confirm({
    title: 'Подтверждение',
    confirmationText: 'Применить',
    cancellationText: 'Отменить',
    content: action === 'clear'
      ? buildClearPassportCheckWarning()
      : buildRestartPassportCheckWarning(parcelCount)
  })
}
