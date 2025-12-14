/* @vitest-environment jsdom */

// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import KeyWordsList from '@/lists/KeyWords_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'
import { roleAdmin } from '@/helpers/user.roles.js'

// Mock functions at top level to avoid hoisting issues
const getAllKeyWords = vi.hoisted(() => vi.fn())
const removeKeyWord = vi.hoisted(() => vi.fn())
const uploadKeyWords = vi.hoisted(() => vi.fn())
const ensureLoaded = vi.hoisted(() => vi.fn())
const getMatchTypeName = vi.hoisted(() => vi.fn((id) => id === 1 ? 'Exact' : id === 41 ? 'Morphology' : `Type ${id}`))
const mockPush = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())
const mockError = vi.hoisted(() => vi.fn())
const mockSuccess = vi.hoisted(() => vi.fn())

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
  { id: 1, word: 'стол', matchTypeId: 41, feacnCodes: ['1234567890'] },
  { id: 2, word: 'деревянный', matchTypeId: 1, feacnCodes: [] },
  { id: 3, word: 'стул', matchTypeId: 41, feacnCodes: ['1111111111', '2222222222'] }
])

// Mock stores
vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({
    keyWords: mockKeyWords,
    loading: ref(false),
    getAll: getAllKeyWords,
    remove: removeKeyWord,
    upload: uploadKeyWords
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
    user: ref({ id: 1, roles: [roleAdmin] }),
    isAdmin: ref(true),
    isSrLogist: ref(false),
    isLogist: ref(false),
    isAdminOrSrLogist: ref(true),
    isLogistOrSrLogist: ref(false),
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
    success: mockSuccess,
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
  ActionButton: true,
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
  'v-file-input': {
    template: '<input data-testid="v-file-input" type="file" ref="fileInput" @change="$emit(\'update:modelValue\', $event.target.files)" :accept="accept" />',
    props: ['accept', 'loadingText', 'modelValue'],
    emits: ['update:modelValue']
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
      { id: 1, word: 'стол', matchTypeId: 41, feacnCodes: ['1234567890'] },
      { id: 2, word: 'деревянный', matchTypeId: 1, feacnCodes: [] },
      { id: 3, word: 'стул', matchTypeId: 41, feacnCodes: ['1111111111', '2222222222'] }
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

    it('shows empty table when no keywords exist', async () => {
      mockKeyWords.value = []
      await wrapper.vm.$nextTick()
      
      const dataTable = wrapper.find('[data-testid="v-data-table"]')
      expect(dataTable.exists()).toBe(true)
      expect(wrapper.find('.header-with-actions').exists()).toBe(true)
    })

    it('displays search field always', () => {
      const searchField = wrapper.find('[data-testid="v-text-field"]')
      expect(searchField.exists()).toBe(true)
    })
  })

  describe('Create Functionality', () => {
    it('shows header actions for admin users', () => {
      const headerActions = wrapper.find('.header-actions')
      expect(headerActions.exists()).toBe(true)
    })

    it('calls openCreateDialog when create action invoked', async () => {
      await wrapper.vm.openCreateDialog()
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

      // Test with matching code
      expect(filterFn('123', '123', { raw: { feacnCodes: ['1234567890'] } })).toBe(true)

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

  describe('File Upload Functionality', () => {
    it('shows file input component', () => {
      const fileInput = wrapper.find('[data-testid="v-file-input"]')
      expect(fileInput.exists()).toBe(true)
      expect(fileInput.attributes().accept).toBe('.xls,.xlsx,.csv,.txt')
    })

    it('opens file dialog when upload link is clicked', async () => {
      const fileInputRef = { click: vi.fn() }
      wrapper.vm.fileInput = fileInputRef

      await wrapper.vm.openFileDialog()
      
      expect(fileInputRef.click).toHaveBeenCalledOnce()
    })

    it('handles successful file upload', async () => {
      uploadKeyWords.mockClear()
      getAllKeyWords.mockClear()
      
      uploadKeyWords.mockResolvedValue()
      getAllKeyWords.mockResolvedValue()

      const mockFile = new File(['test content'], 'keywords.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      await wrapper.vm.fileSelected([mockFile])

      expect(uploadKeyWords).toHaveBeenCalledWith(mockFile)
      expect(getAllKeyWords).toHaveBeenCalled()
    })

    it('handles no file selected', async () => {
      // Clear mocks to ensure clean state
      uploadKeyWords.mockClear()
      getAllKeyWords.mockClear()
      
      await wrapper.vm.fileSelected([])
      
      expect(uploadKeyWords).not.toHaveBeenCalled()
      expect(getAllKeyWords).not.toHaveBeenCalled()
    })

    it('handles upload error - bad request', async () => {
      uploadKeyWords.mockRejectedValue({ message: '400 Bad Request' })

      const mockFile = new File(['test content'], 'keywords.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      await wrapper.vm.fileSelected([mockFile])

      expect(mockError).toHaveBeenCalledWith(expect.stringMatching(/^Ошибка при загрузке файла с ключевыми словами. /))
    })

    it('handles upload error - file too large', async () => {
      uploadKeyWords.mockRejectedValue({ message: '413 Payload Too Large' })

      const mockFile = new File(['test content'], 'keywords.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      await wrapper.vm.fileSelected([mockFile])

      expect(mockError).toHaveBeenCalledWith(expect.stringMatching(/^Ошибка при загрузке файла с ключевыми словами. /))
    })

    it('handles upload error - generic error', async () => {
      uploadKeyWords.mockRejectedValue({ message: 'Some other error' })

      const mockFile = new File(['test content'], 'keywords.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      await wrapper.vm.fileSelected([mockFile])

      expect(mockError).toHaveBeenCalledWith(expect.stringMatching(/^Ошибка при загрузке файла с ключевыми словами. /))
    })

    it('clears file input after upload attempt', async () => {
      const mockFileInput = { value: 'some-file' }
      wrapper.vm.fileInput = mockFileInput
      uploadKeyWords.mockRejectedValue({ message: 'Some error' })

      const mockFile = new File(['test content'], 'keywords.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      await wrapper.vm.fileSelected([mockFile])

      expect(mockFileInput.value).toBe(null)
    })
  })
})
