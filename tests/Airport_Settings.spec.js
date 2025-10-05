/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense, ref } from 'vue'
import AirportSettings from '@/dialogs/Airport_Settings.vue'
import { defaultGlobalStubs, createMockStore, resolveAll } from './helpers/test-utils.js'

const mockAirportData = {
  id: 1,
  codeIata: 'SVO',
  codeIcao: 'UUEE',
  name: 'Sheremetyevo International Airport',
  country: 'Russia'
}

const airportRef = ref({ ...mockAirportData })

const mockAirportsStore = createMockStore({
  airport: airportRef,
  getById: vi.fn().mockImplementation(async () => mockAirportData),
  create: vi.fn().mockResolvedValue(mockAirportData),
  update: vi.fn().mockResolvedValue()
})

vi.mock('@/stores/airports.store.js', () => ({
  useAirportsStore: () => mockAirportsStore
}))

const mockRouter = vi.hoisted(() => ({
  push: vi.fn()
}))

vi.mock('@/router', () => ({
  default: mockRouter
}))

vi.mock('pinia', () => ({
  storeToRefs: (store) => {
    if (store.airport) {
      return { airport: store.airport }
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
      handleSubmit() {
        const actions = {
          setErrors: this.setErrors.bind(this)
        }
        this.$emit('submit', this.initialValues || {}, actions)
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
    props: ['name', 'id', 'type', 'class', 'placeholder'],
    template: '<input :name="name" :id="id" :type="type" :placeholder="placeholder" />'
  }
}))

const AsyncWrapper = {
  components: { AirportSettings, Suspense },
  props: ['mode', 'airportId'],
  template: `
    <Suspense>
      <AirportSettings :mode="mode" :airport-id="airportId" />
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  `
}

beforeEach(async () => {
  airportRef.value = { ...mockAirportData }
  vi.clearAllMocks()
  await import('@/router')
})

describe('Airport_Settings.vue', () => {
  it('renders create mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(wrapper.find('h1').text()).toBe('Регистрация кода аэропорта')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
    expect(mockAirportsStore.getById).not.toHaveBeenCalled()
  })

  it('renders edit mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', airportId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(mockAirportsStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('h1').text()).toBe('Изменить информацию о коде аэропорта')
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

    await wrapper.find('form').trigger('submit.prevent')
    await resolveAll()

    expect(mockAirportsStore.create).toHaveBeenCalled()
    expect(mockRouter.push).toHaveBeenCalledWith('/airports')
  })

  it('submits edit form successfully', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', airportId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    await wrapper.find('form').trigger('submit.prevent')
    await resolveAll()

    expect(mockAirportsStore.update).toHaveBeenCalledWith(1, expect.any(Object))
    expect(mockRouter.push).toHaveBeenCalledWith('/airports')
  })

  it('shows api error message on create conflict', async () => {
    mockAirportsStore.create.mockRejectedValueOnce(new Error('409 Conflict'))

    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    await wrapper.find('form').trigger('submit.prevent')
    await resolveAll()

    const alerts = wrapper.findAll('.alert-danger')
    expect(alerts.at(-1)?.text()).toBe('Аэропорт с таким кодом ИАТА уже существует')
  })
})
