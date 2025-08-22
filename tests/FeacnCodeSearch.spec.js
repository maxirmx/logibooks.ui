import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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
})
