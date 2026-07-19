/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { Suspense, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomsStationSettings from '@/dialogs/CustomsStation_Settings.vue'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

const existing = {
  id: 7,
  number: '00102030',
  name: 'Тестовый пост',
  countryIsoNumeric: 643,
  postalCode: '101000',
  city: 'Москва',
  street: 'ул. Первая'
}

const stationRef = ref({ ...existing })
const countriesRef = ref([
  { isoNumeric: 643, nameRuOfficial: 'Российская Федерация' }
])
const getById = vi.hoisted(() => vi.fn())
const create = vi.hoisted(() => vi.fn())
const update = vi.hoisted(() => vi.fn().mockResolvedValue())
const ensureLoaded = vi.hoisted(() => vi.fn().mockResolvedValue())
const push = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const alertClear = vi.hoisted(() => vi.fn())
const alertRef = ref(null)

const stationsStore = {
  customsStation: stationRef,
  getById,
  create,
  update
}

const countriesStore = {
  countries: countriesRef,
  ensureLoaded
}

const alertStore = {
  alert: alertRef,
  error: alertError,
  clear: alertClear
}

vi.mock('@/stores/customs.stations.store.js', () => ({
  useCustomsStationsStore: () => stationsStore
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => countriesStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/router', () => ({
  default: { push }
}))

vi.mock('pinia', () => ({
  storeToRefs: (store) => {
    if (store === stationsStore) return { customsStation: stationRef }
    if (store === countriesStore) return { countries: countriesRef }
    if (store === alertStore) return { alert: alertRef }
    return {}
  }
}))

vi.mock('vee-validate', () => ({
  Form: {
    name: 'Form',
    props: ['initialValues', 'validationSchema'],
    emits: ['submit'],
    data: () => ({ errors: {}, isSubmitting: false }),
    methods: {
      setErrors(errors) {
        this.errors = { ...this.errors, ...errors }
      }
    },
    template: `
      <form>
        <slot :errors="errors" :isSubmitting="isSubmitting" />
      </form>
    `
  },
  Field: {
    name: 'Field',
    props: ['name', 'id', 'type', 'as', 'inputmode', 'pattern', 'placeholder'],
    template: `
      <select v-if="as === 'select'" :name="name" :id="id"><slot /></select>
      <input v-else :name="name" :id="id" :type="type" :inputmode="inputmode"
        :pattern="pattern" :placeholder="placeholder" />
    `
  }
}))

const AsyncWrapper = {
  components: { CustomsStationSettings, Suspense },
  props: ['mode', 'customsStationId'],
  template: `
    <Suspense>
      <CustomsStationSettings :mode="mode" :customs-station-id="customsStationId" />
    </Suspense>
  `
}

async function mountSettings(props) {
  const wrapper = mount(AsyncWrapper, {
    props,
    global: {
      stubs: defaultGlobalStubs
    }
  })
  await resolveAll()
  return wrapper
}

beforeEach(() => {
  stationRef.value = { ...existing }
  alertRef.value = null
  vi.clearAllMocks()
  getById.mockResolvedValue(existing)
  create.mockResolvedValue(existing)
  update.mockResolvedValue()
})

describe('CustomsStation_Settings.vue', () => {
  it('renders create mode and loads countries', async () => {
    const wrapper = await mountSettings({ mode: 'create' })

    expect(wrapper.find('h1').text()).toBe('Регистрация таможенного поста')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
    expect(ensureLoaded).toHaveBeenCalled()
    expect(getById).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Номер:')
    expect(wrapper.text()).toContain('Название:')
    expect(wrapper.text()).toContain('Страна:')
    expect(wrapper.text()).toContain('Почтовый индекс:')
    expect(wrapper.text()).toContain('Город:')
    expect(wrapper.text()).toContain('Улица:')
  })

  it('renders edit mode and loads the selected station', async () => {
    const wrapper = await mountSettings({ mode: 'edit', customsStationId: 7 })

    expect(getById).toHaveBeenCalledWith(7)
    expect(wrapper.find('h1').text()).toBe('Изменить информацию о таможенном посте')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
  })

  it('reports an edit loading failure through the alert store and returns to the list', async () => {
    getById.mockRejectedValueOnce(new Error('load failed'))

    await mountSettings({ mode: 'edit', customsStationId: 7 })

    expect(alertError).toHaveBeenCalledWith('Ошибка при загрузке данных таможенного поста')
    expect(push).toHaveBeenCalledWith('/customsstations')
  })

  it('configures number as a digit-preserving text field', async () => {
    const wrapper = await mountSettings({ mode: 'create' })
    const number = wrapper.find('#number')

    expect(number.attributes('type')).toBe('text')
    expect(number.attributes('inputmode')).toBe('numeric')
    expect(number.attributes('pattern')).toBe('[0-9]*')

    const schema = wrapper.findComponent({ name: 'Form' }).props('validationSchema')
    await expect(schema.validate({
      id: 0,
      number: '00102030',
      name: 'Пост',
      countryIsoNumeric: 643
    })).resolves.toMatchObject({ number: '00102030' })
    await expect(schema.validate({
      id: 0,
      number: '12A',
      name: 'Пост',
      countryIsoNumeric: 643
    })).rejects.toThrow('только цифры')
  })

  it('requires number, name, and country but permits an empty physical address', async () => {
    const wrapper = await mountSettings({ mode: 'create' })
    const schema = wrapper.findComponent({ name: 'Form' }).props('validationSchema')

    await expect(schema.validate({
      id: 0,
      number: '',
      name: 'Пост',
      countryIsoNumeric: 643
    })).rejects.toThrow('Номер таможенного поста обязателен')
    await expect(schema.validate({
      id: 0,
      number: '001',
      name: '',
      countryIsoNumeric: 643
    })).rejects.toThrow('Название обязательно')
    await expect(schema.validate({
      id: 0,
      number: '001',
      name: 'Пост',
      countryIsoNumeric: null
    })).rejects.toThrow('Страна обязательна')
    await expect(schema.validate({
      id: 0,
      number: '001',
      name: 'Пост',
      countryIsoNumeric: 643,
      postalCode: '',
      city: '',
      street: ''
    })).resolves.toBeTruthy()
  })

  it('creates with all fields and preserves leading zeroes', async () => {
    const wrapper = await mountSettings({ mode: 'create' })
    const values = { ...existing, id: 0 }

    wrapper.findComponent({ name: 'Form' }).vm.$emit(
      'submit',
      values,
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(create).toHaveBeenCalledWith(values)
    expect(create.mock.calls[0][0].number).toBe('00102030')
    expect(push).toHaveBeenCalledWith('/customsstations')
  })

  it('normalizes wrapped form values and updates the requested station', async () => {
    const wrapper = await mountSettings({ mode: 'edit', customsStationId: 7 })

    wrapper.findComponent({ name: 'Form' }).vm.$emit(
      'submit',
      { value: { ...existing, city: 'Казань' } },
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(update).toHaveBeenCalledWith(7, { ...existing, city: 'Казань' })
    expect(push).toHaveBeenCalledWith('/customsstations')
  })

  it('normalizes missing and primitive form values without changing number strings', async () => {
    const wrapper = await mountSettings({ mode: 'create' })
    const form = wrapper.findComponent({ name: 'Form' })

    form.vm.$emit('submit', null, { setErrors: vi.fn() })
    await resolveAll()
    form.vm.$emit('submit', '00102030', { setErrors: vi.fn() })
    await resolveAll()

    expect(create).toHaveBeenNthCalledWith(1, {})
    expect(create).toHaveBeenNthCalledWith(2, '00102030')
  })

  it('shows the precise server conflict message', async () => {
    const error = Object.assign(new Error('Таможенный пост с таким номером уже существует'), {
      status: 409
    })
    create.mockRejectedValueOnce(error)
    const setErrors = vi.fn()
    const wrapper = await mountSettings({ mode: 'create' })

    wrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { ...existing }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: error.message })
    expect(push).not.toHaveBeenCalled()
  })

  it('shows operation-specific fallback errors', async () => {
    create.mockRejectedValueOnce({})
    update.mockRejectedValueOnce({})
    const createErrors = vi.fn()
    const updateErrors = vi.fn()
    const createWrapper = await mountSettings({ mode: 'create' })
    createWrapper.findComponent({ name: 'Form' }).vm.$emit(
      'submit',
      { ...existing },
      { setErrors: createErrors }
    )
    await resolveAll()

    const editWrapper = await mountSettings({ mode: 'edit', customsStationId: 7 })
    editWrapper.findComponent({ name: 'Form' }).vm.$emit(
      'submit',
      { ...existing },
      { setErrors: updateErrors }
    )
    await resolveAll()

    expect(createErrors).toHaveBeenCalledWith({
      apiError: 'Ошибка при регистрации таможенного поста'
    })
    expect(updateErrors).toHaveBeenCalledWith({
      apiError: 'Ошибка при сохранении информации о таможенном посте'
    })
  })

  it('navigates back from the cancel button', async () => {
    const wrapper = await mountSettings({ mode: 'create' })

    await wrapper.find('[data-testid="cancel-button"]').trigger('click')

    expect(push).toHaveBeenCalledWith('/customsstations')
  })

  it('renders every validation and API error slot', async () => {
    const wrapper = await mountSettings({ mode: 'create' })
    const form = wrapper.findComponent({ name: 'Form' })

    form.vm.setErrors({
      number: 'number error',
      name: 'name error',
      countryIsoNumeric: 'country error',
      postalCode: 'postal error',
      city: 'city error',
      street: 'street error',
      apiError: 'api error'
    })
    await resolveAll()

    const validationMessages = [
      'number error',
      'name error',
      'country error',
      'postal error',
      'city error',
      'street error'
    ]

    expect(wrapper.findAll('.invalid-feedback').map(error => error.text()))
      .toEqual(validationMessages)
    expect(wrapper.findAll('.alert-danger')).toHaveLength(1)
    expect(wrapper.find('.alert-danger').text()).toBe('api error')
  })

  it('renders and dismisses alerts from the alert store', async () => {
    alertRef.value = {
      type: 'alert-danger',
      message: 'Ошибка загрузки'
    }
    const wrapper = await mountSettings({ mode: 'create' })

    const alert = wrapper.find('.alert-dismissable')
    expect(alert.text()).toContain('Ошибка загрузки')
    expect(alert.classes()).toContain('alert-danger')

    await alert.find('.close').trigger('click')

    expect(alertClear).toHaveBeenCalled()
  })
})
