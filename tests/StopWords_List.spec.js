/* @vitest-environment jsdom */

// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import StopWordsList from '@/lists/StopWords_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'
import { roleAdmin } from '@/helpers/user.roles.js'

// Mock functions at top level to avoid hoisting issues
const getAllStopWords = vi.hoisted(() => vi.fn())
const createStopWord = vi.hoisted(() => vi.fn())
const updateStopWord = vi.hoisted(() => vi.fn())
const removeStopWord = vi.hoisted(() => vi.fn())
const getStopWordById = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())
const mockCountries = ref([
  { isoNumeric: 643, nameRuShort: 'Россия' },
  { isoNumeric: 860, nameRuShort: 'Узбекистан' }
])

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
const mockStopWords = ref([
  {
    id: 1,
    word: 'и',
    matchTypeId: 41,
    scopes: [{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'export stop reason' }]
  },
  {
    id: 2,
    word: 'или',
    matchTypeId: 1,
    scopes: [{ countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import stop reason' }]
  },
  {
    id: 3,
    word: 'но',
    matchTypeId: 41,
    scopes: [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'dual export stop reason' },
      { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'dual import stop reason' }
    ]
  },
  {
    id: 4,
    word: 'кроме',
    matchTypeId: 1,
    scopes: [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: '' },
      { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import only dual stop reason' }
    ]
  }
])

// Mock stores
vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => ({
    stopWords: mockStopWords,
    stopWord: ref({ loading: false }),
    loading: ref(false),
    getAll: getAllStopWords,
    getById: getStopWordById,
    create: createStopWord,
    update: updateStopWord,
    remove: removeStopWord
  })
}))

vi.mock('@/stores/word.match.types.store.js', () => ({
  useWordMatchTypesStore: () => ({
    matchTypes: ref([
      { id: 1, name: 'Exact' },
      { id: 41, name: 'Morphology' }
    ]),
    ensureLoaded: vi.fn(),
    getName: vi.fn((id) => (id === 1 ? 'Exact' : id === 41 ? 'Morphology' : `Тип ${id}`))
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: mockCountries.value,
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
    getCountryShortName: vi.fn((code) => Number(code) === 643 ? 'Россия' : 'Узбекистан')
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    user: ref({ id: 1, roles: [roleAdmin] }),
    isAdmin: true,
    isSrLogist: false,
    isLogist: false,
    isSrLogistPlus: true,
    hasLogistRole: false,
    stopwords_per_page: ref(10),
    stopwords_search: ref(''),
    stopwords_procedure: ref('all'),
    stopwords_country: ref('all'),
    stopwords_sort_by: ref(['id']),
    stopwords_page: ref(1)
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
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

const extendedStubs = {
  ...defaultGlobalStubs,
  ActionButton: true,
  'v-card': {
    template: '<div data-testid="v-card"><slot></slot></div>',
    props: ['elevation']
  },
  'v-data-table': {
    template: `
      <div data-testid="v-data-table">
        <div v-for="(item, i) in items" :key="i" class="v-data-table-row">
          <div v-for="header in headers" :key="header.key" class="v-data-table-cell">
            <slot :name="'item.' + header.key" :item="item">
              {{ item[header.key] }}
            </slot>
          </div>
        </div>
        <slot name="top"></slot>
        <slot></slot>
      </div>
    `,
    props: [
      'loading',
      'headers',
      'items',
      'search',
      'custom-filter',
      'items-per-page-options',
      'class',
      'item-value',
      'page',
      'v-model:items-per-page',
      'items-per-page-text',
      'page-text',
      'v-model:page',
      'v-model:sort-by',
      'density'
    ]
  },
  'v-text-field': {
    template:
      '<input data-testid="v-text-field" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'append-inner-icon', 'label', 'variant', 'hide-details']
  },
  'v-select': {
    template:
      '<select data-testid="v-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>',
    props: ['modelValue', 'items', 'label', 'variant', 'hide-details', 'disabled']
  },
  'v-autocomplete': {
    template:
      '<select data-testid="v-autocomplete" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>',
    props: ['modelValue', 'items', 'label', 'variant', 'hide-details', 'disabled']
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

describe('StopWords_List.vue', () => {
  let wrapper

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Reset reactive data
    mockStopWords.value = [
      {
        id: 1,
        word: 'и',
        matchTypeId: 41,
        scopes: [{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'export stop reason' }]
      },
      {
        id: 2,
        word: 'или',
        matchTypeId: 1,
        scopes: [{ countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import stop reason' }]
      },
      {
        id: 3,
        word: 'но',
        matchTypeId: 41,
        scopes: [
          { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'dual export stop reason' },
          { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'dual import stop reason' }
        ]
      },
      {
        id: 4,
        word: 'кроме',
        matchTypeId: 1,
        scopes: [
          { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: '' },
          { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import only dual stop reason' }
        ]
      }
    ]

    wrapper = mount(StopWordsList, {
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

  describe('Navigation Functions', () => {
    it('navigates to edit page when openEditDialog is called', async () => {
      const testStopWord = mockStopWords.value[0]
      await wrapper.vm.openEditDialog(testStopWord)

      expect(mockPush).toHaveBeenCalledWith(`/stopword/edit/${testStopWord.id}`)
    })

    it('navigates to create page when openCreateDialog is called', async () => {
      await wrapper.vm.openCreateDialog()

      expect(mockPush).toHaveBeenCalledWith('/stopword/create')
    })
  })

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      mockConfirm.mockResolvedValue(true)
      const testStopWord = mockStopWords.value[0]

      await wrapper.vm.deleteStopWord(testStopWord)

      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Подтверждение',
        confirmationText: 'Удалить',
        cancellationText: 'Не удалять',
        content: 'Удалить стоп-слово "' + testStopWord.word + '" ?'
      }))
    })

    it('does not call remove when deletion is cancelled', async () => {
      mockConfirm.mockResolvedValue(false)
      const testStopWord = mockStopWords.value[0]

      await wrapper.vm.deleteStopWord(testStopWord)

      expect(removeStopWord).not.toHaveBeenCalled()
    })

    it('handles delete error with 409 status', async () => {
      mockConfirm.mockResolvedValue(true)
      const error = new Error('409 Conflict')
      error.message = '409 Conflict'
      removeStopWord.mockRejectedValue(error)

      const testStopWord = mockStopWords.value[0]
      await wrapper.vm.deleteStopWord(testStopWord)

      expect(removeStopWord).toHaveBeenCalledWith(testStopWord.id)
      expect(wrapper.vm.alertStore.error).toHaveBeenCalledWith(
        'Нельзя удалить стоп-слово, у которого есть связанные записи'
      )
    })

    it('handles generic delete error', async () => {
      mockConfirm.mockResolvedValue(true)
      removeStopWord.mockRejectedValue(new Error('Network error'))

      const testStopWord = mockStopWords.value[0]
      await wrapper.vm.deleteStopWord(testStopWord)

      expect(removeStopWord).toHaveBeenCalledWith(testStopWord.id)
      expect(wrapper.vm.alertStore.error).toHaveBeenCalledWith('Ошибка при удалении стоп слова')
    })
  })

  describe('Search and Filter', () => {
    it('filters stop words by procedure, reason, and match type', () => {
      const mockItem = { raw: mockStopWords.value[2] }
      expect(wrapper.vm.filterStopWords(null, 'dual export', mockItem)).toBe(true)
      expect(wrapper.vm.filterStopWords(null, 'dual import', mockItem)).toBe(true)
      expect(wrapper.vm.filterStopWords(null, 'Россия — Экспорт', mockItem)).toBe(true)
      expect(wrapper.vm.filterStopWords(null, 'Узбекистан — Импорт', mockItem)).toBe(true)
      expect(wrapper.vm.filterStopWords(null, 'Morphology', mockItem)).toBe(true)
    })

    it('handles null query', () => {
      const mockItem = { raw: { word: 'и' } }
      const result = wrapper.vm.filterStopWords(null, null, mockItem)
      expect(result).toBe(false)
    })

    it('handles item with null raw property', () => {
      const mockItem = { raw: null }
      const result = wrapper.vm.filterStopWords(null, 'test', mockItem)
      expect(result).toBe(false)
    })

    it('handles item with missing word property', () => {
      const mockItem = { raw: {} }
      const result = wrapper.vm.filterStopWords(null, 'test', mockItem)
      expect(result).toBe(false)
    })
  })

  describe('Table Headers', () => {
    it('filters visible stop words by selected procedure', () => {
      expect(wrapper.vm.filteredStopWords.map((word) => word.word)).toEqual([
        'и',
        'или',
        'но',
        'кроме'
      ])

      wrapper.vm.authStore.stopwords_procedure.value = 'export'
      expect(wrapper.vm.filteredStopWords.map((word) => word.word)).toEqual(['и', 'но', 'кроме'])

      wrapper.vm.authStore.stopwords_procedure.value = 'import'
      expect(wrapper.vm.filteredStopWords.map((word) => word.word)).toEqual(['или', 'но', 'кроме'])
    })

  })

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        word: `слово${i}`,
        matchTypeId: i % 2 === 0 ? 1 : 41
      }))

      mockStopWords.value = largeDataset

      // Filter function should work efficiently
      const mockItem = { raw: { word: 'слово500' } }
      const result = wrapper.vm.filterStopWords(null, 'слово500', mockItem)
      expect(result).toBe(true)
    })
  })
})
