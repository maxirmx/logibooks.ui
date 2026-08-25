// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('responsive layout policy', () => {
  it('keeps wide-table overflow inside the shared table card wrapper', () => {
    const mainCss = readSource('src/assets/main.css')
    const scrollableTableCss = readSource('src/assets/styles/scrollable-table.css')

    expect(mainCss).toContain('Wide-table contract:')
    expect(mainCss).toMatch(/\.table-card\s*\{[^}]*max-width:\s*100%[^}]*min-width:\s*0[^}]*overflow:\s*hidden/s)
    expect(mainCss).toMatch(/\.table-card \.v-table__wrapper\s*\{[^}]*overflow-x:\s*auto/s)
    expect(scrollableTableCss).not.toMatch(/\.table-card\s*\{/)
    expect(scrollableTableCss).not.toContain('overflow: visible')
  })

  it('does not duplicate the shared wide-table contract in route components', () => {
    const migratedFiles = [
      'src/lists/StopWords_List.vue',
      'src/lists/FeacnLocalPrefixes_List.vue',
      'src/lists/RegisterHistory_List.vue',
      'src/components/CustomsProcessingRegistersTable.vue',
      'src/components/WarehouseRegistersTable.vue'
    ]

    for (const file of migratedFiles) {
      const source = readSource(file)
      expect(source, file).not.toMatch(/\.[\w-]+-table-card\.table-card\s*\{[^}]*width:\s*100%/s)
    }
  })

  it('lets FEACN overlays fit the viewport and keeps wide trees internally scrollable', () => {
    const editor = readSource('src/components/FeacnCodeEditor.vue')
    const selector = readSource('src/components/FeacnCodeSelectorW.vue')
    const search = readSource('src/components/FeacnCodeSearch.vue')

    expect(editor).toMatch(/\.feacn-overlay\s*\{[^}]*right:\s*0[^}]*width:\s*min\(90vw, 1600px\)[^}]*min-width:\s*0/s)
    expect(editor).not.toContain('min-width: 600px')
    expect(selector).toMatch(/\.keyword-search-overlay\s*\{[^}]*right:\s*0[^}]*width:\s*min\(420px, 90vw\)[^}]*min-width:\s*0/s)
    expect(selector).not.toContain('min-width: 420px')
    expect(search).toMatch(/\.tree-container\s*\{[^}]*overflow-x:\s*auto/s)
  })

  it('uses the shared responsive edit heading without local header breakpoints', () => {
    const editRoutes = [
      'src/dialogs/Register_EditDialog.vue',
      'src/dialogs/GtcParcel_EditDialog.vue',
      'src/dialogs/OzonParcel_EditDialog.vue',
      'src/dialogs/Wbr2Parcel_EditDialog.vue',
      'src/dialogs/WbrParcel_EditDialog.vue',
      'src/dialogs/WbrNParcel_EditDialog.vue'
    ]

    for (const file of editRoutes) {
      const source = readSource(file)
      expect(source, file).toContain('primary-heading responsive-edit-heading')
      expect(source, file).not.toMatch(/\.header-with-actions\s*\{/)
      expect(source, file).not.toContain('@media (max-width: 768px)')
    }
  })

  it('uses gap instead of row-dependent separators for wrapping header actions', () => {
    const mainCss = readSource('src/assets/main.css')

    expect(mainCss).toMatch(/\.header-actions-bar\s*\{[^}]*flex-wrap:\s*wrap[^}]*gap:\s*0\.5rem/s)
    expect(mainCss).not.toMatch(/\.header-actions-group\s*\+\s*\.header-actions-group/)
  })

  it('documents filter modifiers and allows search and pagination controls to shrink', () => {
    const filterBar = readSource('src/components/ResponsiveFilterBar.vue')
    const parcelsByNumber = readSource('src/lists/ParcelsByNumber_List.vue')
    const pagination = readSource('src/components/PaginationFooter.vue')

    expect(filterBar).toContain('Sizing modifiers:')
    expect(filterBar).toContain('min-width: min(100%, var(--responsive-filter-basis, 18rem))')
    expect(parcelsByNumber).toContain('parcels-number-search-actions')
    expect(parcelsByNumber).toContain('min-width: min(100%, 13.75rem)')
    expect(pagination).toContain('min-width: min(100%, 12.5rem)')
  })
})
