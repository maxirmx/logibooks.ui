// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { getClearParcelDefectErrorMessage, getSetParcelDefectErrorMessage, isParcelDefect, isParcelDuplicate, isParcelMarkedByPartner } from '@/helpers/parcel.defect.helpers.js'

describe('parcel defect helpers', () => {
  it('detects special statuses from projection only', () => {
    expect(
      isParcelDefect({
        checkStatusProjection: { kind: scanjobCheckStatusProjectionKind.Defect, title: 'Брак' }
      })
    ).toBe(true)
    expect(isParcelDuplicate({ checkStatusProjection: { restrictionReason: 'Дубликат' } })).toBe(
      true
    )
    expect(
      isParcelDuplicate({
        checkStatus: CheckStatusCode.Duplicate2.value,
        checkStatusProjection: {
          kind: scanjobCheckStatusProjectionKind.Checked,
          title: 'Проверено'
        }
      })
    ).toBe(true)
    expect(
      isParcelMarkedByPartner({ checkStatusProjection: { title: 'Исключено партнёром' } })
    ).toBe(true)
  })

  it('returns expected error messages for defect actions', () => {
    expect(getSetParcelDefectErrorMessage(new Error('403 forbidden'))).toBe(
      'Нет прав для отметки посылки как брак'
    )
    expect(getSetParcelDefectErrorMessage('404')).toBe('Посылка не найдена')
    expect(getSetParcelDefectErrorMessage(new Error('409 conflict'))).toBe(
      'Нельзя отметить эту посылку как брак'
    )
    expect(getSetParcelDefectErrorMessage({ status: 403 })).toBe(
      'Нет прав для отметки посылки как брак'
    )
    expect(getSetParcelDefectErrorMessage({ status: 404, message: '403 forbidden' })).toBe(
      'Посылка не найдена'
    )
    expect(getSetParcelDefectErrorMessage({ response: { status: 409 } })).toBe(
      'Нельзя отметить эту посылку как брак'
    )
    expect(getSetParcelDefectErrorMessage(new Error('500'))).toBe(
      'Ошибка при отметке посылки как брак'
    )

    expect(getClearParcelDefectErrorMessage(new Error('403 forbidden'))).toBe(
      'Нет прав для отмены брака'
    )
    expect(getClearParcelDefectErrorMessage({ status: 403 })).toBe('Нет прав для отмены брака')
    expect(getClearParcelDefectErrorMessage('404')).toBe('Посылка не найдена')
    expect(getClearParcelDefectErrorMessage({ response: { status: 404 } })).toBe(
      'Посылка не найдена'
    )
    expect(getClearParcelDefectErrorMessage(new Error('500'))).toBe('Ошибка при отмене брака')
  })
})
