/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense, ref } from 'vue'
import ScanjobsSettings from '@/dialogs/Scanjob_Settings.vue'
import { defaultGlobalStubs, createMockStore, resolveAll } from './helpers/test-utils.js'

const mockScanJobData = {
  id: 1,
  name: 'Сканирование приемки',
  type: 0,
  operation: 1,
  mode: 2,
  status: 3,
  warehouseId: 10,
  dealNumber: 'D-100',
  registerId: 99
}

const mockOps = ref({
  types: [{ value: 0, name: 'Тип 1' }],
  operations: [{ value: 1, name: 'Операция 1' }],
  modes: [{ value: 2, name: 'Режим 1' }],
  statuses: [{ value: 3, name: 'Статус 1' }]
})

// Use a plain object to store the scanjob value (simulating Pinia's unwrapping behavior)
let scanjobValue = { ...mockScanJobData }

const mockScanjobsStore = {
  // Pinia auto-unwraps refs, so scanjob should appear as a plain value when accessed
  get scanjob() {
    return scanjobValue
  },
  set scanjob(val) {
    scanjobValue = val
  },
  ops: mockOps,
  ensureOpsLoaded: vi.fn().mockResolvedValue(mockOps.value),
  getById: vi.fn().mockImplementation(async () => {
    scanjobValue = { ...mockScanJobData }
    return scanjobValue
  }),
  create: vi.fn().mockResolvedValue(mockScanJobData),
  update: vi.fn().mockResolvedValue()
}

const mockWarehousesStore = createMockStore({
  warehouses: [{ id: 10, name: 'Основной склад' }],
  getAll: vi.fn().mockResolvedValue(),
  ensureLoaded: vi.fn().mockResolvedValue(),
  getWarehouseName: vi.fn(id => (id ? `Warehouse ${id}` : 'Не указан'))
})

const mockAlertStore = createMockStore({
  alert: null,
  error: vi.fn(),
  clear: vi.fn()
})

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => mockScanjobsStore
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => mockWarehousesStore
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
    if (store.ops !== undefined || store.scanjob !== undefined) {
      return { ops: store.ops, scanjob: store.scanjob }
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
        isSubmitting: false
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
        <option value="">Выберите значение</option>
        <option v-for="option in options" :key="option.value || option.id" :value="option.value || option.id">
          {{ option.name || option.label }}
        </option>
      </select>
      <component v-else :is="as" :name="name" :id="id" />
    `,
    data() {
      return {
        options: [
          ...mockOps.value.types,
          ...mockOps.value.operations,
          ...mockOps.value.modes,
          ...mockOps.value.statuses,
          ...mockWarehousesStore.warehouses
        ]
      }
    }
  }
}))

const AsyncWrapper = {
  components: { ScanjobsSettings, Suspense },
  props: ['mode', 'scanjobId', 'registerId', 'warehouseId', 'dealNumber'],
  template: `
    <Suspense>
      <ScanjobsSettings
        :mode="mode"
        :scanjob-id="scanjobId"
        :register-id="registerId"
        :warehouse-id="warehouseId"
        :deal-number="dealNumber"
      />
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  `
}

beforeEach(async () => {
  scanjobValue = { ...mockScanJobData }
  vi.clearAllMocks()
  await import('@/router')
})

describe('Scanjob_Settings.vue', () => {
  it('renders create mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create', registerId: 88, warehouseId: 10, dealNumber: 'D-200' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(wrapper.find('h1').text()).toBe('Создание задания на сканирование')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
    expect(mockScanjobsStore.getById).not.toHaveBeenCalled()
    expect(wrapper.find('#dealNumber').element.value).toBe('D-200')
    expect(wrapper.find('#dealNumber').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#warehouseName').element.value).toBe('Warehouse 10')
    expect(wrapper.find('#warehouseName').attributes('readonly')).toBeDefined()
  })

  it('renders edit mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', scanjobId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(mockScanjobsStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('h1').text()).toBe('Редактировать задание на сканирование')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
  })

  it('submits create form successfully', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create', registerId: 88, warehouseId: 10 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      name: 'Новое скан-задание',
      type: 0,
      operation: 1,
      mode: 2,
      status: 3,
      warehouseId: 10
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockScanjobsStore.create).toHaveBeenCalled()
    expect(mockScanjobsStore.create).toHaveBeenCalledWith(expect.objectContaining({
      registerId: 88,
      warehouseId: 10
    }))
    expect(mockRouter.push).toHaveBeenCalledWith('/scanjobs')
  })

  it('submits edit form successfully', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', scanjobId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      name: 'Обновленное скан-задание',
      type: 1,
      operation: 2,
      mode: 1,
      status: 0,
      warehouseId: 10,
      registerId: 99
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockScanjobsStore.update).toHaveBeenCalledWith(1, expect.any(Object))
    expect(mockRouter.push).toHaveBeenCalledWith('/scanjobs')
  })

  it('shows api error message on create conflict', async () => {
    mockScanjobsStore.create.mockRejectedValueOnce(new Error('409 Conflict'))

    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create', registerId: 88 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const formComponent = wrapper.findComponent({ name: 'Form' })
    const setErrors = vi.fn()

    await formComponent.vm.$emit('submit', {
      name: 'Скан-задание',
      type: 0,
      operation: 1,
      mode: 2,
      status: 3,
      warehouseId: 10
    }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: 'Такое задание на сканирование уже существует' })
  })

  it('redirects when scanjobId is missing in edit mode', async () => {
    // Create an error handler to catch the expected error
    const errorHandler = vi.fn()

    // Mount the component with missing scanjobId
    // This will trigger the runtime guard and redirect
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', scanjobId: undefined },
      global: {
        stubs: defaultGlobalStubs,
        config: {
          errorHandler
        }
      }
    })

    // Wait for any async operations
    await resolveAll()

    // Verify the error was caught and handled
    expect(errorHandler).toHaveBeenCalled()
    const error = errorHandler.mock.calls[0][0]
    expect(error.message).toBe('scanjobId is required when mode is edit')

    // Verify that the redirect and alert were called
    expect(mockRouter.push).toHaveBeenCalledWith('/scanjobs')
    expect(mockAlertStore.error).toHaveBeenCalledWith('Невозможно редактировать задание на сканирование: отсутствует идентификатор')

    wrapper.unmount()
  })
})
