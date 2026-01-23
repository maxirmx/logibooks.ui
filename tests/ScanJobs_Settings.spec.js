/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense, ref } from 'vue'
import ScanJobsSettings from '@/dialogs/ScanJobs_Settings.vue'
import { defaultGlobalStubs, createMockStore, resolveAll } from './helpers/test-utils.js'

const mockScanJobData = {
  id: 1,
  name: 'Сканирование посылок',
  type: 0,
  operation: 1,
  mode: 0,
  status: 0,
  warehouseId: 10
}

const scanJobRef = ref({ ...mockScanJobData })

const mockScanJobsStore = createMockStore({
  scanJob: scanJobRef,
  getById: vi.fn().mockImplementation(async () => mockScanJobData),
  create: vi.fn().mockResolvedValue(mockScanJobData),
  update: vi.fn().mockResolvedValue()
})

const mockWarehousesStore = createMockStore({
  warehouses: [
    { id: 10, name: 'Основной склад' },
    { id: 12, name: 'Склад 2' }
  ],
  getAll: vi.fn().mockResolvedValue([])
})

const mockAlertStore = createMockStore({
  alert: null,
  error: vi.fn(),
  clear: vi.fn()
})

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanJobsStore: () => mockScanJobsStore
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
    if (store.scanJob !== undefined) {
      return { scanJob: store.scanJob }
    }
    if (store.warehouses !== undefined) {
      return { warehouses: { value: store.warehouses } }
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
        <slot></slot>
      </select>
      <component v-else :is="as" :name="name" :id="id" />
    `
  }
}))

const AsyncWrapper = {
  components: { ScanJobsSettings, Suspense },
  props: ['mode', 'scanjobId'],
  template: `
    <Suspense>
      <ScanJobsSettings :mode="mode" :scanjob-id="scanjobId" />
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  `
}

beforeEach(async () => {
  scanJobRef.value = { ...mockScanJobData }
  vi.clearAllMocks()
  await import('@/router')
})

describe('ScanJobs_Settings.vue', () => {
  it('renders create mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(wrapper.find('h1').text()).toBe('Создание задания сканирования')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
    expect(mockScanJobsStore.getById).not.toHaveBeenCalled()
    expect(mockWarehousesStore.getAll).toHaveBeenCalled()
  })

  it('renders edit mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', scanjobId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(mockScanJobsStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('h1').text()).toBe('Редактировать задание сканирования')
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
      name: 'Новое задание',
      warehouseId: 10,
      type: 0,
      operation: 1,
      mode: 0,
      status: 0
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockScanJobsStore.create).toHaveBeenCalled()
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
      name: 'Обновленное задание',
      warehouseId: 12,
      type: 1,
      operation: 2,
      mode: 1,
      status: 1
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockScanJobsStore.update).toHaveBeenCalledWith(1, expect.any(Object))
    expect(mockRouter.push).toHaveBeenCalledWith('/scanjobs')
  })

  it('shows api error message on create conflict', async () => {
    mockScanJobsStore.create.mockRejectedValueOnce(new Error('409 Conflict'))

    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const formComponent = wrapper.findComponent({ name: 'Form' })
    const setErrors = vi.fn()

    await formComponent.vm.$emit('submit', { name: 'Задание' }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: 'Задание с таким названием уже существует' })
  })
})
