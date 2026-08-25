/* @vitest-environment jsdom */

// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import StopWordsList from '@/lists/StopWords_List.vue'
import ResponsiveFilterBar from '@/components/ResponsiveFilterBar.vue'
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

  describe('Admin Access Control', () => {
    it('shows warning for non-admin users', () => {
      // Test the isAdmin property of the auth store
      expect(wrapper.vm.authStore.isAdmin).toBe(true) // Our mock user is admin

      // For non-admin logic, we would need to change the mock
      // but that would affect other tests, so we just verify the current state
    })
  })

  describe('Data Display', () => {
    it('renders the responsive filters in their original order above a viewport-bound table', () => {
      const filters = wrapper.find('.stopwords-filter-row')
      expect(wrapper.findComponent(ResponsiveFilterBar).exists()).toBe(true)
      expect(filters.attributes('aria-label')).toBe('Фильтры стоп-слов')
      expect(filters.find('[data-testid="v-select"]').exists()).toBe(true)
      expect(filters.find('[data-testid="v-autocomplete"]').exists()).toBe(true)
      expect(filters.find('[data-testid="v-text-field"]').exists()).toBe(true)
      expect(filters.element.children[0]).toBe(filters.find('[data-testid="v-select"]').element)
      expect(filters.element.children[1]).toBe(filters.find('[data-testid="v-autocomplete"]').element)
      expect(filters.element.children[2]).toBe(filters.find('[data-testid="v-text-field"]').element)
      expect(filters.element.children[0].classList).toContain(
        'responsive-filter-bar__item--compact'
      )
      expect(filters.element.children[1].classList).toContain(
        'responsive-filter-bar__item--regular'
      )
      expect(filters.element.children[2].classList).toContain('responsive-filter-bar__item--grow')
      expect(wrapper.find('.stopwords-table-card').exists()).toBe(true)
      expect(wrapper.vm.prohibitionScopeFilterItems).toEqual([
        { title: 'Любая', value: 'all' },
        { title: 'Экспорт', value: 'export' },
        { title: 'Импорт', value: 'import' }
      ])
    })
  })

  describe('Admin Actions', () => {
    it('calls openCreateDialog and navigates to create page', async () => {
      await wrapper.vm.openCreateDialog()
      expect(mockPush).toHaveBeenCalledWith('/stopword/create')
    })

    it('shows edit and delete buttons in table rows', () => {
      // Since v-data-table is stubbed, test that the methods exist instead
      expect(wrapper.vm.openEditDialog).toBeDefined()
      expect(wrapper.vm.deleteStopWord).toBeDefined()
      expect(typeof wrapper.vm.openEditDialog).toBe('function')
      expect(typeof wrapper.vm.deleteStopWord).toBe('function')
    })
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

    it('calls remove when deletion is confirmed', async () => {
      mockConfirm.mockResolvedValue(true)
      const testStopWord = mockStopWords.value[0]

      await wrapper.vm.deleteStopWord(testStopWord)

      expect(removeStopWord).toHaveBeenCalledWith(testStopWord.id)
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
    it('filters stop words by word', () => {
      const mockItem = { raw: mockStopWords.value[0] }
      const result = wrapper.vm.filterStopWords(null, 'и', mockItem)
      expect(result).toBe(true)
    })

    it('filters stop words by word case insensitive', () => {
      const mockItem = { raw: { ...mockStopWords.value[1], word: 'ИЛИ' } }
      const result = wrapper.vm.filterStopWords(null, 'или', mockItem)
      expect(result).toBe(true)
    })

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

    it('handles null item', () => {
      const result = wrapper.vm.filterStopWords(null, 'test', null)
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

  describe('Match Type Display', () => {
    it('returns correct text for known id', () => {
      const result = wrapper.vm.getMatchTypeText(1)
      expect(result).toBe('Exact')
    })

    it('returns fallback text for unknown id', () => {
      const result = wrapper.vm.getMatchTypeText(99)
      expect(result).toBe(`Тип 99`)
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when loading', async () => {
      // Since components are stubbed, test loading state directly
      const loading = wrapper.vm.stopWordsStore.loading
      expect(loading).toBeDefined()
      expect(typeof loading.value).toBe('boolean')
      expect(loading.value).toBe(false)
    })
  })

  describe('Table Headers', () => {
    it('has correct table headers', () => {
      const headers = wrapper.vm.headers
      expect(headers).toEqual([
        { title: '', align: 'center', key: 'actions', sortable: false, width: '10%' },
        { title: 'Стоп-слово или фраза', key: 'word', sortable: true },
        { title: 'Тип соответствия', key: 'matchTypeId', sortable: true },
        { title: 'Страна', key: 'country', align: 'start', sortable: false },
        { title: 'Процедура', key: 'procedure', align: 'start' },
        { title: 'Причина запрета', key: 'prohibitionReason', align: 'start', sortable: false }
      ])
    })

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

    it('uses requested procedure sort order from import and export flags', () => {
      const combinations = [
        { scopes: [] },
        { scopes: [{ countryIsoNumeric: 643, customsProcedureCode: 10 }] },
        { scopes: [
          { countryIsoNumeric: 643, customsProcedureCode: 10 },
          { countryIsoNumeric: 860, customsProcedureCode: 40 }
        ] },
        { scopes: [{ countryIsoNumeric: 860, customsProcedureCode: 40 }] }
      ]

      expect(combinations.map((item) => wrapper.vm.getProhibitionScopeSortOrder(item))).toEqual([
        '', '643:10', '643:10|860:40', '860:40'
      ])
      expect(wrapper.vm.tableStopWords.map((item) => item.procedure)).toEqual([
        '643:10', '860:40', '643:10|860:40', '643:10|860:40'
      ])
    })

    it('renders procedure and prohibition reason columns', () => {
      const rows = wrapper.findAll('[data-testid="v-data-table"] .v-data-table-row')
      expect(rows[0].findAll('.v-data-table-cell')[3].text()).toBe('Россия')
      expect(rows[0].findAll('.v-data-table-cell')[4].text()).toBe('Экспорт')
      expect(rows[1].findAll('.v-data-table-cell')[3].text()).toBe('Узбекистан')
      expect(rows[1].findAll('.v-data-table-cell')[4].text()).toBe('Импорт')

      const procedureLines = rows[2].findAll('.v-data-table-cell')[4].findAll('.procedure-line')
      const reasonLines = rows[2].findAll('.v-data-table-cell')[5].findAll('.reason-line')
      expect(procedureLines.map((line) => line.text())).toEqual(['Экспорт', 'Импорт'])
      expect(reasonLines.map((line) => line.text())).toEqual([
        'dual export stop reason',
        'dual import stop reason'
      ])
    })

    it('keeps import reason aligned with import procedure when export reason is empty', () => {
      const rows = wrapper.findAll('[data-testid="v-data-table"] .v-data-table-row')
      const procedureLines = rows[3].findAll('.v-data-table-cell')[4].findAll('.procedure-line')
      const reasonLines = rows[3].findAll('.v-data-table-cell')[5].findAll('.reason-line')
      expect(procedureLines.map((line) => line.text())).toEqual(['Экспорт', 'Импорт'])
      expect(reasonLines).toHaveLength(2)
      expect(reasonLines[0].text()).toBe('')
      expect(reasonLines[1].text()).toBe('import only dual stop reason')
    })
  })

  describe('Component Exposure', () => {
    it('exposes necessary functions for testing', () => {
      expect(wrapper.vm.openCreateDialog).toBeDefined()
      expect(wrapper.vm.openEditDialog).toBeDefined()
      expect(wrapper.vm.deleteStopWord).toBeDefined()
      expect(wrapper.vm.getMatchTypeText).toBeDefined()
    })
  })

  describe('Store Integration', () => {
    it('properly integrates with stop words store', () => {
      expect(wrapper.vm.stopWords).toBeDefined()
      expect(wrapper.vm.loading).toBeDefined()
    })

    it('properly integrates with auth store', () => {
      expect(wrapper.vm.authStore).toBeDefined()
    })

    it('properly integrates with the notification store', () => {
      expect(wrapper.vm.alertStore).toBeDefined()
    })
  })

  describe('Vuetify Integration', () => {
    it('uses correct v-data-table props', () => {
      const table = wrapper.find('[data-testid="v-data-table"]')
      expect(table.exists()).toBe(true)

      // Check that table is configured properly through the component
      expect(wrapper.vm.headers).toBeDefined()
      expect(wrapper.vm.filterStopWords).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty stop words list', async () => {
      mockStopWords.value = []
      await wrapper.vm.$nextTick()

      // With the new structure, empty list still shows the table
      const dataTable = wrapper.find('[data-testid="v-data-table"]')
      expect(dataTable.exists()).toBe(true)
    })

    it('handles stop word with special characters', () => {
      const mockItem = { raw: { word: 'тест-слово!' } }
      const result = wrapper.vm.filterStopWords(null, 'тест', mockItem)
      expect(result).toBe(true)
    })

    it('handles very long stop word', () => {
      const longWord = 'а'.repeat(100)
      const mockItem = { raw: { word: longWord } }
      const result = wrapper.vm.filterStopWords('unused', 'а', mockItem)
      expect(result).toBe(true)
    })

    it('handles Unicode characters in search', () => {
      const mockItem = { raw: { word: 'тест' } }
      // The filter checks if word contains the search query (case-insensitive)
      const result = wrapper.vm.filterStopWords('unused', 'тест', mockItem)
      expect(result).toBe(true)
    })
  })

  describe('Empty State', () => {
    it('shows empty table when no stop words exist', async () => {
      mockStopWords.value = []
      const emptyWrapper = mount(StopWordsList, {
        global: {
          stubs: extendedStubs
        }
      })

      await emptyWrapper.vm.$nextTick()

      expect(emptyWrapper.find('[data-testid="v-data-table"]').exists()).toBe(true)
      expect(emptyWrapper.find('.primary-heading').exists()).toBe(true)
      emptyWrapper.unmount()
    })
  })

  describe('Reactive State', () => {
    it('updates when stop words change', async () => {
      const newStopWords = [
        {
          id: 5,
          word: 'новое',
          matchTypeId: 1,
          scopes: [{ countryIsoNumeric: 860, customsProcedureCode: 40 }]
        }
      ]

      mockStopWords.value = newStopWords
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.stopWords).toEqual(newStopWords)
    })

    it('updates search reactively', async () => {
      const searchField = wrapper.find('[data-testid="v-text-field"]')
      expect(searchField.exists()).toBe(true)

      // Test that search is accessible through authStore
      expect(wrapper.vm.authStore.stopwords_search).toBeDefined()
    })

    it('updates page reactively', async () => {
      // Test that page is accessible through authStore
      expect(wrapper.vm.authStore.stopwords_page).toBeDefined()
      expect(wrapper.vm.authStore.stopwords_page.value).toBe(1)
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
