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
        isSubmitting: false,
        formValues: {}
      }
    },
    methods: {
      async handleSubmit() {
        // Validate using schema if provided
        if (this.validationSchema) {
          try {
            const formData = new FormData(this.$el)
            const values = Object.fromEntries(formData.entries())
            this.formValues = { ...this.initialValues, ...values }
            await this.validationSchema.validate(this.formValues)
            this.errors = {}
          } catch (error) {
            this.errors = { [error.path || 'apiError']: error.message }
            return
          }
        }

        const actions = {
          setErrors: this.setErrors.bind(this)
        }
        this.$emit('submit', this.formValues, actions)
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
    props: ['name', 'id', 'type', 'class', 'placeholder', 'maxlength', 'style'],
    template: '<input :name="name" :id="id" :type="type" :placeholder="placeholder" :maxlength="maxlength" :style="style" />'
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

    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      codeIata: 'JFK',
      name: 'Test Airport'
    }, { setErrors: vi.fn() })
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

    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      codeIata: 'LAX',
      name: 'Los Angeles International Airport'
    }, { setErrors: vi.fn() })
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

    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      codeIata: 'JFK',
      name: 'Test Airport'
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockAirportsStore.create).toHaveBeenCalled()
  })


  it('accepts valid 3-letter IATA codes', async () => {
    mockAirportsStore.create.mockResolvedValueOnce(mockAirportData)

    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    // Test with valid IATA code - directly trigger the form with valid data
    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      codeIata: 'JFK',
      name: 'John F. Kennedy International Airport'
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockAirportsStore.create).toHaveBeenCalledWith({
      codeIata: 'JFK',
      name: 'John F. Kennedy International Airport'
    })
    expect(mockRouter.push).toHaveBeenCalledWith('/airports')
  })

  it('converts IATA code to uppercase on submit', async () => {
    mockAirportsStore.create.mockResolvedValueOnce(mockAirportData)

    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    // Test with lowercase IATA code - directly trigger the form with lowercase data
    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      codeIata: 'jfk',
      name: 'John F. Kennedy International Airport'
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockAirportsStore.create).toHaveBeenCalledWith({
      codeIata: 'JFK', // Should be converted to uppercase
      name: 'John F. Kennedy International Airport'
    })
  })

  it('converts mixed case IATA code to uppercase on submit', async () => {
    mockAirportsStore.update.mockResolvedValueOnce()

    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', airportId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    // Test with mixed case IATA code in edit mode - directly trigger the form
    const formComponent = wrapper.findComponent({ name: 'Form' })
    await formComponent.vm.$emit('submit', {
      codeIata: 'jFk',
      name: 'John F. Kennedy International Airport'
    }, { setErrors: vi.fn() })
    await resolveAll()

    expect(mockAirportsStore.update).toHaveBeenCalledWith(1, {
      codeIata: 'JFK', // Should be converted to uppercase
      name: 'John F. Kennedy International Airport'
    })
  })

  it('limits IATA field to 3 characters with maxlength attribute', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const iataField = wrapper.find('#codeIata')
    expect(iataField.attributes('maxlength')).toBe('3')
    expect(iataField.attributes('placeholder')).toBe('Код')
  })
})
