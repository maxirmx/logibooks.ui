import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FeacnCodeSearchByKeyword from '@/components/FeacnCodeSearchByKeyword.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const keyWords = ref([])
const ensureLoaded = vi.fn(async () => {})

vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({
    keyWords,
    ensureLoaded
  })
}))

describe('FeacnCodeSearchByKeyword', () => {
  beforeEach(() => {
    keyWords.value = [
      { id: 1, word: 'Test keyword', feacnCodes: ['1111', '2222'] },
      { id: 2, word: 'Another', feacnCodes: ['3333'] }
    ]
    ensureLoaded.mockClear()
  })

  const createWrapper = (props = {}) =>
    mount(FeacnCodeSearchByKeyword, {
      props: { modelValue: true, ...props },
      global: {
        stubs: {
          ...vuetifyStubs
        }
      }
    })

  it('ensures keywords are loaded on mount', () => {
    createWrapper()
    expect(ensureLoaded).toHaveBeenCalled()
  })

  it('renders separate rows for each feacn code', () => {
    const wrapper = createWrapper()
    const rows = wrapper.findAll('[data-testid="feacn-keyword-selector-item"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('1111')
    expect(rows[1].text()).toContain('2222')
    expect(rows[2].text()).toContain('3333')
  })

  it('filters rows by search term using shared helper', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input')
    await input.setValue('another')
    const rows = wrapper.findAll('[data-testid="feacn-keyword-selector-item"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Another')
  })

  it('emits select event when row is clicked', async () => {
    const wrapper = createWrapper()
    const row = wrapper.find('[data-testid="feacn-keyword-selector-item"]')
    await row.trigger('click')
    expect(wrapper.emitted().select[0]).toEqual(['1111'])
  })

  it('emits select when pressing enter on highlighted row', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: 'Enter' })
    const events = wrapper.emitted('select')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual(['1111'])
  })
})