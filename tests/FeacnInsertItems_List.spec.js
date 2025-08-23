/* @vitest-environment jsdom */

// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FeacnInsertItemsList from '@/components/FeacnInsertItems_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

// Hoisted mocks
const getAllItems = vi.hoisted(() => vi.fn())
const removeItem = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())
const mockError = vi.hoisted(() => vi.fn())
const mockSuccess = vi.hoisted(() => vi.fn())
const mockLoadTooltip = vi.hoisted(() => vi.fn())

const mockInsertItems = ref([
  { id: 1, code: '1234567890', insertBefore: 'before1', insertAfter: 'after1' },
  { id: 2, code: '0987654321', insertBefore: 'before2', insertAfter: 'after2' }
])

// Mock stores and modules
vi.mock('@/stores/feacn.insert.items.store.js', () => ({
  useFeacnInsertItemsStore: () => ({
    insertItems: mockInsertItems,
    loading: ref(false),
    getAll: getAllItems,
    remove: removeItem
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({ isAdmin: ref(true) })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn(),
    success: mockSuccess,
    error: mockError
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => mockConfirm
}))

vi.mock('@/router', () => ({
  default: { push: mockPush }
}))

vi.mock('@/helpers/feacn.tooltip.helpers.js', () => ({
  loadFeacnTooltipOnHover: mockLoadTooltip,
  useFeacnTooltips: () => ref({})
}))

describe('FeacnInsertItems_List.vue', () => {
  let wrapper

  beforeEach(() => {
    getAllItems.mockClear()
    removeItem.mockClear()
    mockPush.mockClear()
    mockConfirm.mockClear()
    wrapper = mount(FeacnInsertItemsList, {
      global: {
        stubs: vuetifyStubs
      }
    })
  })

  it('fetches items on mount', () => {
    expect(getAllItems).toHaveBeenCalled()
  })

  it('renders heading and items', () => {
    expect(wrapper.text()).toContain('Фразы для формирования описания продукта')
    const rows = wrapper.findAll('[data-testid="v-data-table"] .v-data-table-row')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('1234567890')
  })

  it('navigates to create view on link click', async () => {
    const link = wrapper.find('a.link')
    await link.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/feacninsertitem/create')
  })

  it('navigates to edit view via function', async () => {
    await wrapper.vm.openEditDialog(mockInsertItems.value[0])
    expect(mockPush).toHaveBeenCalledWith('/feacninsertitem/edit/1')
  })

  it('removes item when confirmed', async () => {
    mockConfirm.mockResolvedValue(true)
    await wrapper.vm.deleteInsertItem(mockInsertItems.value[0])
    expect(removeItem).toHaveBeenCalledWith(1)
  })

  it('does not remove item when cancelled', async () => {
    mockConfirm.mockResolvedValue(false)
    await wrapper.vm.deleteInsertItem(mockInsertItems.value[0])
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('loads FEACN tooltip on hover', async () => {
    const codeCell = wrapper.find('.feacn-code-tooltip')
    await codeCell.trigger('mouseenter')
    expect(mockLoadTooltip).toHaveBeenCalledWith('1234567890')
  })
})

