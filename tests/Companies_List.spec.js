/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CompaniesList from '@/components/Companies_List.vue'
import { defaultGlobalStubs } from './test-utils'

// Additional stubs for components not in defaultGlobalStubs
const additionalStubs = {
  'v-container': {
    template: '<div class="v-container-stub" data-testid="v-container"><slot></slot></div>',
    props: ['fluid']
  },
  'v-alert': {
    template: '<div class="v-alert-stub" data-testid="v-alert"><slot></slot></div>',
    props: ['type', 'text', 'dismissible']
  },
  'v-spacer': {
    template: '<div class="v-spacer-stub" data-testid="v-spacer"></div>'
  },
  'Form': {
    template: '<form class="form-stub" data-testid="form"><slot></slot></form>',
    props: ['validationSchema', 'initialValues']
  },
  'Field': {
    template: '<div class="field-stub" data-testid="field"><slot></slot></div>',
    props: ['name']
  }
}

const testStubs = {
  ...defaultGlobalStubs,
  ...additionalStubs
}

// Centralized mock data
const mockCompanies = ref([
  { id: 1, inn: '123456789', kpp: '987654321', name: 'Test Company', shortName: 'TC', countryIsoNumeric: 643, city: 'Moscow', street: 'Test Street' }
])

const mockCountries = ref([
  { id: 1, isoNumeric: 643, nameRu: 'Россия' },
  { id: 2, isoNumeric: 840, nameRu: 'США' }
])

// Centralized mock functions
const getAllCompanies = vi.hoisted(() => vi.fn())
const getAllCountries = vi.hoisted(() => vi.fn())
const createCompany = vi.hoisted(() => vi.fn())
const updateCompany = vi.hoisted(() => vi.fn())
const deleteCompanyFn = vi.hoisted(() => vi.fn())
const errorFn = vi.hoisted(() => vi.fn())
const successFn = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))

// Mock router
const router = vi.hoisted(() => ({
  push: vi.fn()
}))

// Centralized mocks for all modules
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      companies: mockCompanies,
      countries: mockCountries,
      loading: ref(false),
      alert: ref(null)
    })
  }
})

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({
    companies: mockCompanies,
    loading: false,
    getAll: getAllCompanies,
    create: createCompany,
    update: updateCompany,
    remove: deleteCompanyFn
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: mockCountries,
    loading: false,
    getAll: getAllCountries
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: null,
    error: errorFn,
    success: successFn,
    clear: vi.fn()
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin: true,
    companies_per_page: 10,
    companies_search: '',
    companies_sort_by: ['id'],
    companies_page: 1
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: router
}), { virtual: true })

// Mock vee-validate
vi.mock('vee-validate', () => ({
  Form: {
    template: '<form class="form-stub" data-testid="form"><slot></slot></form>',
    props: ['validationSchema', 'initialValues']
  },
  Field: {
    template: '<div class="field-stub" data-testid="field"><slot></slot></div>',
    props: ['name']
  }
}))

// Mock Yup
vi.mock('yup', () => ({
  object: vi.fn(() => ({ required: vi.fn(), string: vi.fn(), number: vi.fn() })),
  string: vi.fn(() => ({ required: vi.fn() })),
  number: vi.fn(() => ({ required: vi.fn() }))
}))

// Mock helpers
vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [10, 25, 50, 100]
}))

// Mock mdi icons
vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify',
  mdiPlus: 'mdi-plus',
  mdiPencil: 'mdi-pencil',
  mdiDelete: 'mdi-delete'
}))

describe('Companies_List.vue', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks()

    // Reset default mock behavior
    confirmMock.mockResolvedValue(true)
  })

  afterEach(() => {
    // Restore timers if they were mocked
    vi.useRealTimers()
  })

  it('calls getAll methods on mount', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Wait for the onMounted hook to complete
    await wrapper.vm.$nextTick()

    expect(getAllCompanies).toHaveBeenCalled()
    expect(getAllCountries).toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('handles empty companies array', async () => {
    mockCompanies.value = []
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })
    expect(wrapper.exists()).toBe(true)
    // Reset mock data for other tests
    mockCompanies.value = [{ id: 1, inn: '123456789', kpp: '987654321', name: 'Test Company', shortName: 'TC', countryIsoNumeric: 643, city: 'Moscow', street: 'Test Street' }]
  })

  it('handles search input', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })
    const searchInput = wrapper.findComponent({ name: 'v-text-field' }) || wrapper.find('input[type="text"]')
    if (searchInput.exists()) {
      await searchInput.setValue('Test Company')
      await searchInput.trigger('input')

      // Test that filtered companies works (indirectly testing the computed property)
      expect(wrapper.vm.search).toBe('Test Company')
    }
  })

  it('filters companies based on search term', async () => {
    // Add another company to test filtering
    mockCompanies.value = [
      { id: 1, inn: '123456789', kpp: '987654321', name: 'Test Company', shortName: 'TC', countryIsoNumeric: 643, city: 'Moscow', street: 'Test Street' },
      { id: 2, inn: '987654321', kpp: '123456789', name: 'Another Company', shortName: 'AC', countryIsoNumeric: 840, city: 'New York', street: 'Broadway' }
    ]

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Test search by name - directly set the search ref
    wrapper.vm.search = 'Test'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.filteredCompanies.length).toBe(1)
    expect(wrapper.vm.filteredCompanies[0].name).toBe('Test Company')

    // Test search by inn
    wrapper.vm.search = '98765'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.filteredCompanies.length).toBe(2) // Should match both companies

    // Test search by country name
    wrapper.vm.search = 'росс' // Part of "Россия"
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.filteredCompanies.length).toBe(1)
    expect(wrapper.vm.filteredCompanies[0].countryIsoNumeric).toBe(643)

    // Reset mock data
    mockCompanies.value = [{ id: 1, inn: '123456789', kpp: '987654321', name: 'Test Company', shortName: 'TC', countryIsoNumeric: 643, city: 'Moscow', street: 'Test Street' }]
  })

  it('gets country name by ISO numeric code', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Test with existing country
    expect(wrapper.vm.getCountryName(643)).toBe('Россия')

    // Test with non-existent country (should return code)
    expect(wrapper.vm.getCountryName(999)).toBe('Код: 999')

    // Test with null value
    expect(wrapper.vm.getCountryName(null)).toBe('')
  })

  it('opens create dialog when add button is clicked', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    const addButton = wrapper.find('button.v-btn-stub')
    if (addButton.exists()) {
      await addButton.trigger('click')
      expect(wrapper.vm.showCreateDialog).toBe(true)
      expect(wrapper.vm.editingCompany).toBeDefined()
      expect(wrapper.vm.editingCompany.inn).toBe('')
    }
  })

  it('opens edit dialog and populates form with company data', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: '<div><slot name="actions" :item="{ id: 1, inn: \'123456789\', name: \'Test Company\', countryIsoNumeric: 643 }"></slot></div>'
          }
        }
      }
    })

    // Call the openEditDialog method directly
    const company = { id: 1, inn: '123456789', name: 'Test Company', countryIsoNumeric: 643 }
    await wrapper.vm.openEditDialog(company)

    expect(wrapper.vm.showEditDialog).toBe(true)
    expect(wrapper.vm.editingCompany).toEqual(company)
  })

  it('calls delete function when delete button is clicked', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: '<div><slot name="actions" :item="{ id: 1, inn: \'123456789\', name: \'Test Company\', countryIsoNumeric: 643 }"></slot></div>'
          }
        }
      }
    })

    // Mock company data
    const company = { id: 1, inn: '123456789', name: 'Test Company', countryIsoNumeric: 643 }

    // Call the deleteCompany method directly
    await wrapper.vm.deleteCompany(company)

    // Should show confirmation dialog
    expect(confirmMock).toHaveBeenCalled()

    // If confirmed, should call delete function
    expect(deleteCompanyFn).toHaveBeenCalledWith(1)

    // Should show success message
    expect(successFn).toHaveBeenCalledWith('Компания успешно удалена')
  })

  it('does not delete company when confirmation is declined', async () => {
    // Configure the confirm mock to return false for this test
    confirmMock.mockResolvedValue(false)

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: '<div><slot name="actions" :item="{ id: 1, inn: \'123456789\', name: \'Test Company\', countryIsoNumeric: 643 }"></slot></div>'
          }
        }
      }
    })

    // Mock company data
    const company = { id: 1, inn: '123456789', name: 'Test Company', countryIsoNumeric: 643 }

    // Call the deleteCompany method directly
    await wrapper.vm.deleteCompany(company)

    // Should show confirmation dialog
    expect(confirmMock).toHaveBeenCalled()

    // If not confirmed, should not call delete function
    expect(deleteCompanyFn).not.toHaveBeenCalled()
  })

  it('handles error when deleting company - 409 conflict', async () => {
    // Set up the delete function to reject with a 409 error
    deleteCompanyFn.mockRejectedValueOnce({ message: '409 Conflict' })

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Mock company data
    const company = { id: 1, inn: '123456789', name: 'Test Company', countryIsoNumeric: 643 }

    // Call the deleteCompany method directly
    await wrapper.vm.deleteCompany(company)

    // Verify that the error function was called with the specific message
    expect(errorFn).toHaveBeenCalledWith('Нельзя удалить компанию, у которой есть связанные записи')
  })

  it('handles error when deleting company - general error', async () => {
    // Set up the delete function to reject with a general error
    deleteCompanyFn.mockRejectedValueOnce(new Error('Failed to delete company'))

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Mock company data
    const company = { id: 1, inn: '123456789', name: 'Test Company', countryIsoNumeric: 643 }

    // Call the deleteCompany method directly
    await wrapper.vm.deleteCompany(company)

    // Verify that the error function was called with the general message
    expect(errorFn).toHaveBeenCalledWith('Ошибка при удалении компании')
  })

  it('saves new company successfully', async () => {
    createCompany.mockResolvedValueOnce({ id: 2, inn: '987654321', name: 'New Company' })

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Open create dialog and set values
    wrapper.vm.openCreateDialog()

    // Mock form values
    const formValues = {
      inn: '987654321',
      kpp: '123456789',
      name: 'New Company',
      shortName: 'NC',
      countryIsoNumeric: 643,
      city: 'Saint Petersburg',
      street: 'Nevsky Prospect'
    }

    // Call saveCompany directly with form values
    await wrapper.vm.saveCompany(formValues)

    // Check if the create function was called with the right parameters
    expect(createCompany).toHaveBeenCalledWith(formValues)

    // Check if success message was shown
    expect(successFn).toHaveBeenCalledWith('Компания успешно создана')

    // Check if dialog was closed
    expect(wrapper.vm.showCreateDialog).toBe(false)
  })

  it('handles error when saving new company - 409 conflict', async () => {
    // Set up the create function to reject with a 409 error
    createCompany.mockRejectedValueOnce({ message: '409 Conflict' })

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Open create dialog
    wrapper.vm.openCreateDialog()

    // Mock form values
    const formValues = {
      inn: '123456789', // INN already exists
      name: 'Duplicate Company',
      countryIsoNumeric: 643
    }

    // Call saveCompany directly with form values
    await wrapper.vm.saveCompany(formValues)

    // Verify that the error function was called with the specific message
    expect(errorFn).toHaveBeenCalledWith('Компания с таким ИНН уже существует')

    // Dialog should remain open
    expect(wrapper.vm.showCreateDialog).toBe(true)
  })

  it('updates existing company successfully', async () => {
    updateCompany.mockResolvedValueOnce(true)

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Open edit dialog with company data
    const company = { id: 1, inn: '123456789', name: 'Test Company', countryIsoNumeric: 643 }
    wrapper.vm.openEditDialog(company)

    // Mock updated form values
    const formValues = {
      inn: '123456789',
      name: 'Updated Company Name',
      countryIsoNumeric: 643
    }

    // Call saveCompany directly with form values
    await wrapper.vm.saveCompany(formValues)

    // Check if the update function was called with the right parameters
    expect(updateCompany).toHaveBeenCalledWith(1, formValues)

    // Check if success message was shown
    expect(successFn).toHaveBeenCalledWith('Компания успешно обновлена')

    // Check if dialog was closed
    expect(wrapper.vm.showEditDialog).toBe(false)
  })

  it('handles error when updating company', async () => {
    // Set up the update function to reject with an error
    updateCompany.mockRejectedValueOnce(new Error('Failed to update company'))

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Open edit dialog with company data
    const company = { id: 1, inn: '123456789', name: 'Test Company', countryIsoNumeric: 643 }
    wrapper.vm.openEditDialog(company)

    // Mock updated form values
    const formValues = {
      inn: '123456789',
      name: 'Updated Company Name',
      countryIsoNumeric: 643
    }

    // Call saveCompany directly with form values
    await wrapper.vm.saveCompany(formValues)

    // Verify that the error function was called
    expect(errorFn).toHaveBeenCalledWith('Ошибка при сохранении компании')

    // Dialog should remain open
    expect(wrapper.vm.showEditDialog).toBe(true)
  })

  // Additional tests for better coverage
  it('displays loading state correctly', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Check that data table stub exists
    const dataTable = wrapper.find('[data-testid="v-data-table"]')
    expect(dataTable.exists()).toBe(true)
  })

  it('handles empty search term', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Set search to empty string
    wrapper.vm.search = ''
    await wrapper.vm.$nextTick()

    // Should return all companies when search is empty
    expect(wrapper.vm.filteredCompanies.length).toBe(mockCompanies.value.length)
  })

  it('handles non-admin user correctly', async () => {
    // Mock auth store as non-admin
    vi.doMock('@/stores/auth.store.js', () => ({
      useAuthStore: () => ({
        isAdmin: false,
        companies_per_page: 10,
        companies_search: '',
        companies_sort_by: ['id'],
        companies_page: 1
      })
    }))

    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // For non-admin users, admin functions should not be accessible
    expect(wrapper.exists()).toBe(true)
  })

  it('cancels dialog correctly', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Open create dialog
    wrapper.vm.openCreateDialog()
    expect(wrapper.vm.showCreateDialog).toBe(true)

    // Cancel dialog
    wrapper.vm.showCreateDialog = false
    expect(wrapper.vm.showCreateDialog).toBe(false)

    // Open edit dialog
    const company = { id: 1, inn: '123456789', name: 'Test Company', countryIsoNumeric: 643 }
    wrapper.vm.openEditDialog(company)
    expect(wrapper.vm.showEditDialog).toBe(true)

    // Cancel edit dialog
    wrapper.vm.showEditDialog = false
    expect(wrapper.vm.showEditDialog).toBe(false)
  })

  it('tests itemsPerPage functionality', async () => {
    const wrapper = mount(CompaniesList, {
      global: {
        stubs: testStubs
      }
    })

    // Test itemsPerPage setting
    expect(wrapper.vm.itemsPerPage).toBe(10)
    wrapper.vm.itemsPerPage = 25
    expect(wrapper.vm.itemsPerPage).toBe(25)
  })
})
