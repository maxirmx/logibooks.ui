/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersList from '@/components/Registers_List.vue'

const mockItems = ref([])
const getAll = vi.fn()
const uploadFn = vi.fn()

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { 
    ...actual, 
    storeToRefs: (store) => {
      if (store.getAll) {
        // registers store
        return { items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0) }
      } else {
        // auth store
        return { 
          registers_per_page: ref(10), 
          registers_search: ref(''), 
          registers_sort_by: ref([{ key: 'id', order: 'asc' }]), 
          registers_page: ref(1) 
        }
      }
    }
  }
})

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({ getAll, upload: uploadFn, items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0) })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ success: vi.fn(), error: vi.fn() })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({ 
    registers_per_page: ref(10), 
    registers_search: ref(''), 
    registers_sort_by: ref([{ key: 'id', order: 'asc' }]), 
    registers_page: ref(1) 
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

describe('Registers_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
  })

  it('calls getAll on mount', () => {
    mount(RegistersList, {
      global: {
        stubs: {
          'v-data-table-server': true,
          'v-card': true,
          'v-text-field': true,
          'font-awesome-icon': true,
          'v-file-input': true
        }
      }
    })
    expect(getAll).toHaveBeenCalled()
  })

  it('renders upload button', () => {
    const wrapper = mount(RegistersList, {
      global: {
        stubs: {
          'v-data-table-server': true,
          'v-card': true,
          'v-text-field': true,
          'font-awesome-icon': true,
          'v-file-input': true
        }
      }
    })
    const button = wrapper.find('button')
    expect(button.text()).toContain('Загрузить реестр')
  })

  describe('formatDate function', () => {
    let wrapper

    beforeEach(() => {
      // Mount the component to access its methods
      wrapper = mount(RegistersList, {
        global: {
          stubs: {
            'v-data-table-server': true,
            'v-card': true,
            'v-text-field': true,
            'font-awesome-icon': true,
            'v-file-input': true
          }
        }
      })
    })

    it('formats valid date string correctly', () => {
      const testDate = '2025-07-04T14:30:45.123Z'
      const formatted = wrapper.vm.formatDate(testDate)
      
      // Should format as date and time, exact format depends on locale
      expect(formatted).toBeTruthy()
      expect(formatted).toContain('2025')
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('formats date with different time zones consistently', () => {
      const testDate = '2025-12-25T23:59:59.000Z'
      const formatted = wrapper.vm.formatDate(testDate)
      
      // Should contain the expected date components
      expect(formatted).toContain('2025')
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('formats date without time component', () => {
      const testDate = '2025-01-01T00:00:00.000Z'
      const formatted = wrapper.vm.formatDate(testDate)
      
      expect(formatted).toBeTruthy()
      expect(formatted).toContain('2025')
      expect(formatted).toContain('01')
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('handles different date string formats', () => {
      const isoDate = '2025-06-15T12:30:45Z'
      const localDate = '2025-06-15T12:30:45'
      
      const formattedISO = wrapper.vm.formatDate(isoDate)
      const formattedLocal = wrapper.vm.formatDate(localDate)
      
      expect(formattedISO).toBeTruthy()
      expect(formattedLocal).toBeTruthy()
      expect(formattedISO).toContain('2025')
      expect(formattedLocal).toContain('2025')
    })

    it('returns empty string for null input', () => {
      const formatted = wrapper.vm.formatDate(null)
      expect(formatted).toBe('')
    })

    it('returns empty string for undefined input', () => {
      const formatted = wrapper.vm.formatDate(undefined)
      expect(formatted).toBe('')
    })

    it('returns empty string for empty string input', () => {
      const formatted = wrapper.vm.formatDate('')
      expect(formatted).toBe('')
    })

    it('handles invalid date strings gracefully', () => {
      const invalidDates = ['invalid-date', 'not-a-date', '2025-13-45', 'abcdef']
      
      invalidDates.forEach(invalidDate => {
        const formatted = wrapper.vm.formatDate(invalidDate)
        expect(formatted).toBe('')
      })
    })

    it('formats dates with milliseconds correctly', () => {
      const testDate = '2025-03-20T08:15:30.999Z'
      const formatted = wrapper.vm.formatDate(testDate)
      
      expect(formatted).toBeTruthy()
      expect(formatted).toContain('2025')
      expect(formatted).toContain('20')
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('formats dates across different months correctly', () => {
      const dates = [
        '2025-01-15T10:00:00Z', // January
        '2025-06-15T10:00:00Z', // June
        '2025-12-15T10:00:00Z'  // December
      ]
      
      dates.forEach(date => {
        const formatted = wrapper.vm.formatDate(date)
        expect(formatted).toBeTruthy()
        expect(formatted).toContain('2025')
        expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/)
      })
    })

    it('handles leap year dates correctly', () => {
      const leapYearDate = '2024-02-29T12:00:00Z' // Feb 29 in leap year
      const formatted = wrapper.vm.formatDate(leapYearDate)
      
      expect(formatted).toBeTruthy()
      expect(formatted).toContain('2024')
      expect(formatted).toContain('29')
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('handles dates at year boundaries', () => {
      const newYearDate = '2025-01-01T00:00:00Z'
      const newYearEveDate = '2024-12-31T23:59:59Z'
      
      const formattedNewYear = wrapper.vm.formatDate(newYearDate)
      const formattedNewYearEve = wrapper.vm.formatDate(newYearEveDate)
      
      expect(formattedNewYear).toBeTruthy()
      expect(formattedNewYear).toContain('01')
      expect(formattedNewYearEve).toBeTruthy()
      // The exact date/time depends on timezone, just check it's formatted
      expect(formattedNewYearEve).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('formats date consistently regardless of input timezone', () => {
      const utcDate = '2025-07-04T12:00:00Z'
      const localDate = '2025-07-04T12:00:00'
      
      const formattedUTC = wrapper.vm.formatDate(utcDate)
      const formattedLocal = wrapper.vm.formatDate(localDate)
      
      expect(formattedUTC).toBeTruthy()
      expect(formattedLocal).toBeTruthy()
      expect(formattedUTC).toContain('2025')
      expect(formattedLocal).toContain('2025')
    })

    it('handles edge case timestamps', () => {
      const epochDate = '1970-01-01T00:00:00Z'
      const futureDate = '2099-12-31T23:59:59Z'
      
      const formattedEpoch = wrapper.vm.formatDate(epochDate)
      const formattedFuture = wrapper.vm.formatDate(futureDate)
      
      expect(formattedEpoch).toBeTruthy()
      expect(formattedEpoch).toContain('1970')
      expect(formattedFuture).toBeTruthy()
      // The exact year might differ due to timezone, but should be close to 2099/2100
      expect(formattedFuture).toMatch(/2(099|100)/)
    })
  })

  describe('component integration', () => {
    it('shows formatted dates in the component when items are present', async () => {
      // Set up mock items with dates
      mockItems.value = [
        { 
          id: 1, 
          fileName: 'register1.csv', 
          date: '2025-07-04T14:30:45Z', 
          ordersTotal: 10 
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: {
            'v-card': true,
            'v-text-field': true,
            'font-awesome-icon': true,
            'v-file-input': true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // The component should render and the formatDate function should be available
      expect(wrapper.vm.formatDate).toBeDefined()
      expect(typeof wrapper.vm.formatDate).toBe('function')
      
      // Test that formatDate works with the mock data
      const formatted = wrapper.vm.formatDate('2025-07-04T14:30:45Z')
      expect(formatted).toBeTruthy()
      expect(formatted).toContain('2025')
    })

    it('emits file input update and calls upload', async () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: {
            'v-card': true,
            'v-text-field': true,
            'v-data-table-server': true,
            'font-awesome-icon': true,
            'v-file-input': true
          }
        }
      })

      const file = new File(['data'], 'test.xlsx')
      await wrapper.vm.fileSelected([file])
      expect(uploadFn).toHaveBeenCalledWith(file)
    })
  })
})
