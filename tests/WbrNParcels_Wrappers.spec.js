/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))

function source(relativePath) {
  return readFileSync(resolve(testDir, '..', 'src', relativePath), 'utf8')
}

describe('WbrN parcel wrappers', () => {
  it('uses WbrN mapping and replacement recipient fields in the regular list', () => {
    const text = source('lists/WbrNParcels_List.vue')

    expect(text).toContain('wbrnRegisterColumnTitles')
    expect(text).not.toContain('wbr2RegisterColumnTitles')
    expect(text).toContain("key: 'article'")
    expect(text).toContain("key: 'productCountryName'")
    expect(text).toContain("key: 'lastName'")
    expect(text).toContain("key: 'firstName'")
    expect(text).toContain("key: 'patronymic'")
    expect(text).toContain("key: 'recipientCountryName'")
    expect(text).toContain("key: 'recipientCity'")
    expect(text).toContain("key: 'recipientAddress'")
    expect(text).not.toContain('paymentAmount')
    expect(text).not.toContain('paymentCurrency')
    expect(text).not.toContain("key: 'countryCode'")
  })

  it('uses WbrN mapping, article, and raw country in the edit dialog', () => {
    const text = source('dialogs/WbrNParcel_EditDialog.vue')

    expect(text).toContain('WbrNFormField')
    expect(text).toContain('ArticleWithH')
    expect(text).toContain(':column-titles="wbrnRegisterColumnTitles"')
    expect(text).toContain('input-readonly')
    expect(text).toContain('name="productCountryName"')
    expect(text).toContain('name="lastName"')
    expect(text).toContain('name="firstName"')
    expect(text).toContain('name="patronymic"')
    expect(text).toContain('name="recipientCountryName"')
    expect(text).toContain('name="recipientCity"')
    expect(text).toContain('name="recipientAddress"')
    expect(text).not.toContain('name="countryCode" as="select"')
    expect(text).not.toContain('paymentAmount')
    expect(text).not.toContain('paymentCurrency')
    expect(text).not.toContain('Wbr2FormField')
  })

  it('has dedicated warehouse and scan wrappers with article support', () => {
    const warehouse = source('lists/WbrNParcels_WhList.vue')
    const scan = source('dialogs/Scanjob_WbrN_Parcels_Monitor_Table.vue')

    expect(warehouse).toContain('wbrnRegisterColumnTitles')
    expect(warehouse).toContain("key: 'article'")
    expect(warehouse).not.toContain('wbr2RegisterColumnTitles')
    expect(scan).toContain('scanjobWbrNParcelHeaders')
  })
})