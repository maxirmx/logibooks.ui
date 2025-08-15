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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import KeyWordsList from '@/components/KeyWords_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

// Mock functions at top level to avoid hoisting issues
const getAllKeyWords = vi.hoisted(() => vi.fn())
const removeKeyWord = vi.hoisted(() => vi.fn())
const ensureLoaded = vi.hoisted(() => vi.fn())
const getMatchTypeName = vi.hoisted(() => vi.fn((id) => id === 1 ? 'Exact' : id === 41 ? 'Morphology' : `Type ${id}`))
const mockPush = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())
const mockError = vi.hoisted(() => vi.fn())

// Mock router
vi.mock('@/router', () => ({
  default: {
    push: mockPush
  }
}))

// Mock confirm dialog
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => mockConfirm
}))

// Centralized mock data
const mockKeyWords = ref([
  { id: 1, word: 'стол', matchTypeId: 41 },
  { id: 2, word: 'деревянный', matchTypeId: 1 },
  { id: 3, word: 'стул', matchTypeId: 41 }
])

// Mock stores
vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({
    keyWords: mockKeyWords,
    loading: ref(false),
    getAll: getAllKeyWords,
    remove: removeKeyWord
  })
}))

vi.mock('@/stores/word.match.types.store.js', () => ({
  useWordMatchTypesStore: () => ({
    matchTypes: ref([{ id: 1, name: 'Exact' }, { id: 41, name: 'Morphology' }]),
    ensureLoaded: ensureLoaded,
    getName: getMatchTypeName
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    user: ref({ id: 1, roles: ['administrator'] }),
    isAdmin: ref(true),
    keywords_per_page: ref(10),
    keywords_search: ref(''),
    keywords_sort_by: ref(['word']),
    keywords_page: ref(1)
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn(),
    success: vi.fn(),
    error: mockError,
    info: vi.fn()
  })
}))

// Mock helpers
vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [
    { value: 5, title: '5' },
    { value: 10, title: '10' },
    { value: 25, title: '25' }
  ]
}))

vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify'
}))

// Create extended stubs
const extendedStubs = {
  ...vuetifyStubs,
  'v-card': {
    template: '<div data-testid="v-card"><slot></slot></div>',
    props: ['elevation']
  },
  'v-data-table': {
    template: `
      <div data-testid="v-data-table">
        <slot name="top"></slot>
        <table>
          <thead>
            <tr>
              <th v-for="header in headers" :key="header.key">{{ header.title }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="index" class="data-row">
              <td v-for="header in headers" :key="header.key">
                <slot :name="'item.' + header.key" :item="{raw: item, columns: {}}">
                  {{ item[header.key] }}
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
        <slot></slot>
      </div>
    `,
    props: ['loading', 'headers', 'items', 'search', 'custom-filter', 'items-per-page-options', 'class', 'item-value', 'page', 'items-per-page', 'items-per-page-text', 'page-text', 'sort-by', 'density']
  },
  'v-text-field': {
    template: '<input data-testid="v-text-field" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'appendInnerIcon', 'label', 'variant', 'hideDetails']
  },
  'v-tooltip': {
    template: '<div data-testid="v-tooltip"><slot name="activator" :props="{}" /><slot /></div>',
    props: ['text']
  },
  'font-awesome-icon': {
    template: '<span data-testid="font-awesome-icon">{{ icon }}</span>',
    props: ['size', 'icon', 'class']
  }
}

describe('KeyWords_List.vue', () => {
  let wrapper

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Reset reactive data
    mockKeyWords.value = [
      { id: 1, word: 'стол', matchTypeId: 41 },
      { id: 2, word: 'деревянный', matchTypeId: 1 },
      { id: 3, word: 'стул', matchTypeId: 41 }
    ]

    wrapper = mount(KeyWordsList, {
      global: {
        stubs: extendedStubs
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Mounting', () => {
    it('renders correctly', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="key-words-list"]').exists()).toBe(true)
    })

    it('displays the correct heading', () => {
      const heading = wrapper.find('.primary-heading')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Ключевые слова и фразы для подбора ТН ВЭД')
    })

    it('initializes data on mount', () => {
      expect(ensureLoaded).toHaveBeenCalledOnce()
      expect(getAllKeyWords).toHaveBeenCalledOnce()
    })
  })

  describe('Data Display', () => {
    it('displays data table when keywords exist', () => {
      const dataTable = wrapper.find('[data-testid="v-data-table"]')
      expect(dataTable.exists()).toBe(true)
    })

    it('shows empty message when no keywords exist', async () => {
      mockKeyWords.value = []
      await wrapper.vm.$nextTick()
      
      const emptyMessage = wrapper.find('.text-center.m-5')
      expect(emptyMessage.exists()).toBe(true)
      expect(emptyMessage.text()).toContain('Список ключевых слов и фраз пуст')
    })

    it('shows loading indicator when loading', async () => {
      wrapper.vm.loading = true
      await wrapper.vm.$nextTick()
      
      const loadingIndicator = wrapper.find('.spinner-border')
      expect(loadingIndicator.exists()).toBe(true)
    })

    it('displays search field when keywords exist', () => {
      const searchField = wrapper.find('[data-testid="v-text-field"]')
      expect(searchField.exists()).toBe(true)
    })
  })

  describe('Create Functionality', () => {
    it('shows create link for admin users', () => {
      const createLink = wrapper.find('.link-crt a')
      expect(createLink.exists()).toBe(true)
      expect(createLink.text()).toContain('Зарегистрировать ключевое слово или фразу')
    })

    it('calls openCreateDialog when create link is clicked', async () => {
      const createLink = wrapper.find('.link-crt a')
      await createLink.trigger('click')
      
      expect(mockPush).toHaveBeenCalledWith('/keyword/create')
    })
  })

  describe('Edit Functionality', () => {
    it('calls openEditDialog when edit button is clicked', async () => {
      // Find the action button for editing in the first row
      const actionButtons = wrapper.findAllComponents({ name: 'ActionButton' })
      
      // Find the edit button (first ActionButton in each row)
      const editButton = actionButtons.find(button => button.props('icon') === 'fa-solid fa-pen')
      
      // Simulate a click on the edit button
      await editButton.vm.$emit('click', { id: 1, word: 'стол' })
      
      expect(mockPush).toHaveBeenCalledWith('/keyword/edit/1')
    })
  })

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete button is clicked', async () => {
      mockConfirm.mockResolvedValue(true)
      
      // Find the action button for deleting
      const actionButtons = wrapper.findAllComponents({ name: 'ActionButton' })
      const deleteButton = actionButtons.find(button => button.props('icon') === 'fa-solid fa-trash-can')
      
      // Simulate a click on the delete button
      await deleteButton.vm.$emit('click', { id: 1, word: 'стол' })
      
      expect(mockConfirm).toHaveBeenCalled()
      expect(mockConfirm.mock.calls[0][0].title).toBe('Подтверждение')
      expect(mockConfirm.mock.calls[0][0].content).toContain('Удалить ключевое слово "стол"')
    })
    
    it('calls remove when confirmation is confirmed', async () => {
      mockConfirm.mockResolvedValue(true)
      
      // Directly call the deleteKeyWord method with a mock keyword
      await wrapper.vm.deleteKeyWord({ id: 1, word: 'стол' })
      
      expect(removeKeyWord).toHaveBeenCalledWith(1)
    })
    
    it('does not call remove when confirmation is cancelled', async () => {
      mockConfirm.mockResolvedValue(false)
      
      // Directly call the deleteKeyWord method with a mock keyword
      await wrapper.vm.deleteKeyWord({ id: 1, word: 'стол' })
      
      expect(removeKeyWord).not.toHaveBeenCalled()
    })
    
    it('shows error message when delete fails with 409', async () => {
      mockConfirm.mockResolvedValue(true)
      removeKeyWord.mockRejectedValue({ message: '409 Conflict' })
      
      // Directly call the deleteKeyWord method with a mock keyword
      await wrapper.vm.deleteKeyWord({ id: 1, word: 'стол' })
      
      expect(mockError).toHaveBeenCalledWith('Нельзя удалить ключевое слово, у которого есть связанные записи')
    })
    
    it('shows generic error message when delete fails with other error', async () => {
      mockConfirm.mockResolvedValue(true)
      removeKeyWord.mockRejectedValue({ message: 'Some other error' })
      
      // Directly call the deleteKeyWord method with a mock keyword
      await wrapper.vm.deleteKeyWord({ id: 1, word: 'стол' })
      
      expect(mockError).toHaveBeenCalledWith('Ошибка при удалении ключевого слова')
    })
  })

  describe('Filter Functionality', () => {
    it('filters keywords correctly', () => {
      const filterFn = wrapper.vm.filterKeyWords

      // Test with matching word
      expect(filterFn('сто', 'сто', { raw: { word: 'стол' } })).toBe(true)
      
      // Test with non-matching word
      expect(filterFn('xyz', 'xyz', { raw: { word: 'стол' } })).toBe(false)
      
      // Test with uppercase query
      expect(filterFn('СТОЛ', 'СТОЛ', { raw: { word: 'стол' } })).toBe(true)
      
      // Test with null values
      expect(filterFn(null, null, { raw: { word: 'стол' } })).toBe(false)
      expect(filterFn('test', 'test', null)).toBe(false)
      expect(filterFn('test', 'test', { raw: null })).toBe(false)
      
      // Test with undefined word (to cover line 61)
      expect(filterFn('test', 'test', { raw: { } })).toBe(false)
    })
  })

  describe('Match Type Display', () => {
    it('gets and displays match type text correctly', () => {
      // Reset the mock counter before making our assertions
      getMatchTypeName.mockClear()
      
      expect(wrapper.vm.getMatchTypeText(1)).toBe('Exact')
      expect(wrapper.vm.getMatchTypeText(41)).toBe('Morphology')
      expect(wrapper.vm.getMatchTypeText(99)).toBe('Type 99')
      
      expect(getMatchTypeName).toHaveBeenCalledTimes(3)
    })
  })

  describe('Alert Display', () => {
    it('shows alert when present', async () => {
      // Set an alert
      wrapper.vm.alert = { type: 'alert-danger', message: 'Test error message' }
      await wrapper.vm.$nextTick()
      
      const alert = wrapper.find('.alert')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Test error message')
    })
  })
})
