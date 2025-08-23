import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
const mockFormatFeacnName = vi.hoisted(() => vi.fn())
const mockFormatFeacnNameFromItem = vi.hoisted(() => vi.fn())
vi.mock('@/helpers/feacn.tooltip.helpers.js', () => ({
  formatFeacnName: mockFormatFeacnName,
  formatFeacnNameFromItem: mockFormatFeacnNameFromItem
}))
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const mockLookup = vi.fn()
const mockGetById = vi.fn()
const mockGetChildren = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    lookup: mockLookup,
    getById: mockGetById,
    getChildren: mockGetChildren
  })
}))

const globalStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': true
}

function createWrapper() {
  return mount(FeacnCodeSearch, {
    global: { stubs: globalStubs }
  })
}

async function waitForUpdates(wrapper) {
  await flushPromises()
  await wrapper.vm.$nextTick()
}

describe('FeacnCodeSearch.vue', () => {
  const root = { id: 1, code: '01', codeEx: '01', name: 'Root', parentId: null }
  const child = { id: 2, code: '0101', codeEx: '0101', name: 'Child', parentId: 1 }
  const leaf = { id: 3, code: '0101010101', codeEx: '0101010101', name: 'Leaf', parentId: 2 }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLookup.mockResolvedValue([])
    mockGetById.mockImplementation(id => {
      if (id === 3) return Promise.resolve(leaf)
      if (id === 2) return Promise.resolve(child)
      if (id === 1) return Promise.resolve(root)
      return Promise.resolve(null)
    })
    mockGetChildren.mockImplementation(id => {
      if (id === null || id === undefined) return Promise.resolve([root])
      if (id === 1) return Promise.resolve([child])
      if (id === 2) return Promise.resolve([leaf])
      return Promise.resolve([])
    })
    mockFormatFeacnName.mockImplementation(code => Promise.resolve(`Name ${code}`))
    mockFormatFeacnNameFromItem.mockImplementation(item => `Name ${item?.code || ''}`)
  })

  it('re-emits select event from tree', async () => {
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    await wrapper.find('.toggle-icon').trigger('click')
    await waitForUpdates(wrapper)
    const childToggle = wrapper.findAll('.toggle-icon').at(1)
    await childToggle.trigger('click')
    await waitForUpdates(wrapper)

    const leafLabel = wrapper.findAll('.node-label').find(n => n.text() === 'Leaf')
    await leafLabel.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0][0]).toBe('0101010101')
  })

  it('has placeholder text', () => {
    const wrapper = createWrapper()
    const input = wrapper.find('.search-input')
    expect(input.attributes('placeholder')).toBe('Код ТН ВЭД или слово для поиска')
  })

  it('uses formatFeacnName for search results', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 1, code: '0101' }])
    mockFormatFeacnName.mockResolvedValueOnce('Formatted Name')
    mockFormatFeacnNameFromItem.mockReturnValueOnce('Formatted Name')
    
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)
    const input = wrapper.find('.search-input')
    await input.setValue('test')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)
    
    expect(mockFormatFeacnName).toHaveBeenCalledWith('0101')
    expect(wrapper.find('.result-name').text()).toBe('Formatted Name')
  })

  it('searches and opens path from result', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 3, code: '0101010101', name: 'Leaf' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('leaf')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    expect(searchButton.exists()).toBe(true)
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(mockLookup).toHaveBeenCalledWith('leaf')
    const resultItem = wrapper.find('.search-result-item')
    expect(resultItem.exists()).toBe(true)

    await resultItem.trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(3)
    expect(mockGetById).toHaveBeenCalledWith(2)
    expect(mockGetById).toHaveBeenCalledWith(1)
  })

  it('shows message when lookup returns no results', async () => {
    mockLookup.mockResolvedValueOnce([])
    const wrapper = createWrapper()

    const input = wrapper.find('.search-input')
    await input.setValue('none')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    expect(searchButton.exists()).toBe(true)
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(wrapper.find('.no-results').exists()).toBe(true)
  })

  it('shows error message when lookup fails', async () => {
    mockLookup.mockRejectedValueOnce(new Error('fail'))
    const wrapper = createWrapper()

    const input = wrapper.find('.search-input')
    await input.setValue('err')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(wrapper.find('.search-error').exists()).toBe(true)
  })

  it('shows error message when getById fails while opening path', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 3, code: '0101010101', name: 'Leaf' }])
    mockGetById.mockImplementation(id => {
      if (id === 3) return Promise.reject(new Error('fail'))
      if (id === 2) return Promise.resolve(child)
      if (id === 1) return Promise.resolve(root)
      return Promise.resolve(null)
    })
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('leaf')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    const resultItem = wrapper.find('.search-result-item')
    await resultItem.trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(3)
    expect(wrapper.find('.search-error').exists()).toBe(true)
  })

  it('does not perform lookup when search key is empty or whitespace', async () => {
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('   ')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(mockLookup).not.toHaveBeenCalled()
    expect(wrapper.find('.search-results').exists()).toBe(false)
  })

  it('ignores search result without id', async () => {
    mockLookup.mockResolvedValueOnce([{ code: '0000', name: 'No ID' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('noid')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    const resultItem = wrapper.find('.search-result-item')
    await resultItem.trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).not.toHaveBeenCalled()
    expect(wrapper.find('.search-results').exists()).toBe(false)
  })

  it('gracefully aborts opening path when a parent node is missing', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 3, code: '0101010101', name: 'Leaf' }])
    mockGetById.mockImplementation(id => {
      if (id === 3) return Promise.resolve(leaf)
      if (id === 2) return Promise.resolve(null)
      if (id === 1) return Promise.resolve(root)
      return Promise.resolve(null)
    })
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('leaf')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    const resultItem = wrapper.find('.search-result-item')
    await resultItem.trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(3)
    expect(mockGetById).toHaveBeenCalledWith(2)
    expect(wrapper.find('.search-error').exists()).toBe(false)
  })
})
