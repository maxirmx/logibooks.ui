/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense, ref } from 'vue'
import WarehouseSettings from '@/dialogs/Warehouse_Settings.vue'
import { defaultGlobalStubs, createMockStore, resolveAll } from './helpers/test-utils.js'

const mockWarehouseData = {
  id: 1,
  name: 'Основной склад',
  countryIsoNumeric: 643,
  postalCode: '123456',
  city: 'Москва',
  street: 'ул. Тестовая',
  type: 0
}

const warehouseRef = ref({ ...mockWarehouseData })

const mockWarehousesStore = createMockStore({
  warehouse: warehouseRef,
  getById: vi.fn().mockImplementation(async () => mockWarehouseData),
  create: vi.fn().mockResolvedValue(mockWarehouseData),
  update: vi.fn().mockResolvedValue()
})

const mockCountriesStore = createMockStore({
  countries: [
    { id: 1, isoNumeric: 643, nameRuOfficial: 'Российская Федерация' },
    { id: 2, isoNumeric: 840, nameRuOfficial: 'Соединенные Штаты Америки' }
  ],
  ensureLoaded: vi.fn()
})

const mockAlertStore = createMockStore({
  alert: null,
  error: vi.fn(),
  clear: vi.fn()
})

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => mockWarehousesStore
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => mockCountriesStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => mockAlertStore
}))

const mockRouter = vi.hoisted(() => ({
  push: vi.fn()
}))

vi.mock('@/router', () => ({
  default: mockRouter
}))

vi.mock('pinia', () => ({
  storeToRefs: (store) => {
    if (store.countries !== undefined) {
      return { countries: { value: store.countries } }
    }
    if (store.warehouse !== undefined) {
      return { warehouse: store.warehouse }
    }
    return {}
  }
}))

vi.mock('vee-validate', () => ({
  Form: {
    name: 'Form',
    props: ['initialValues', 'validationSchema'],
    emits: ['submit'],
    data() {
      return {
        errors: {},
        isSubmitting: false,
        formValues: {}
      }
    },
    methods: {
      async handleSubmit() {
        const actions = {
          setErrors: this.setErrors.bind(this)
        }
        this.$emit('submit', this.$props.initialValues || {}, actions)
      },
      setErrors(newErrors) {
        this.errors = { ...this.errors, ...newErrors }
      }
    },
    template: `
      <form @submit.prevent="handleSubmit">
        <slot :errors="errors" :isSubmitting="isSubmitting" />
      </form>
    `
  },
  Field: {
    name: 'Field',
    props: ['name', 'id', 'type', 'as', 'class', 'placeholder', 'value'],
    template: `
      <input v-if="!as || as === 'input'" :name="name" :id="id" :type="type" :value="value" />
      <select v-else-if="as === 'select'" :name="name" :id="id">
        <option value="">Выберите страну</option>
        <option v-for="country in countries" :key="country.id" :value="country.isoNumeric">
          {{ country.nameRuOfficial }}
        </option>
      </select>
      <component v-else :is="as" :name="name" :id="id" />
    `,
    data() {
      return {
        countries: mockCountriesStore.countries
      }
    }
  }
}))

const AsyncWrapper = {
  components: { WarehouseSettings, Suspense },
  props: ['mode', 'warehouseId'],
  template: `
    <Suspense>
      <WarehouseSettings :mode="mode" :warehouse-id="warehouseId" />
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  `
}

beforeEach(async () => {
  warehouseRef.value = { ...mockWarehouseData }
  vi.clearAllMocks()
  await import('@/router')
})

describe('Warehouse_Settings.vue', () => {
  it('renders create mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(wrapper.find('h1').text()).toBe('Регистрация склада')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
    expect(mockWarehousesStore.getById).not.toHaveBeenCalled()
  })

  it('renders edit mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', warehouseId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(mockWarehousesStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('h1').text()).toBe('Изменить информацию о складе')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
  })

  it('submits create form successfully', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      name: 'Новый склад',
      countryIsoNumeric: 643,
      type: 1
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockWarehousesStore.create).toHaveBeenCalled()
    expect(mockRouter.push).toHaveBeenCalledWith('/warehouses')
  })

  it('submits edit form successfully', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', warehouseId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      name: 'Обновленный склад',
      countryIsoNumeric: 643,
      type: 0
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockWarehousesStore.update).toHaveBeenCalledWith(1, expect.any(Object))
    expect(mockRouter.push).toHaveBeenCalledWith('/warehouses')
  })

  it('shows api error message on create conflict', async () => {
    mockWarehousesStore.create.mockRejectedValueOnce(new Error('409 Conflict'))

    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const formComponent = wrapper.findComponent({ name: 'Form' })
    const setErrors = vi.fn()

    await formComponent.vm.$emit('submit', { name: 'Склад', countryIsoNumeric: 643, type: 0 }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: 'Склад с таким названием уже существует' })
  })
})
