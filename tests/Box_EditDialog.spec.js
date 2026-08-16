/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { Form } from 'vee-validate'
import BoxEditDialog from '@/dialogs/Box_EditDialog.vue'
import ActionButton from '@/components/ActionButton.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const mockBox = ref(null)
const mockBoxLoading = ref(false)
const mockRegister = ref({})
const mockRegisterLoading = ref(false)
const mockAlert = ref(null)

const boxGetById = vi.fn()
const boxCreate = vi.fn()
const boxUpdate = vi.fn()
const registerGetById = vi.fn()
const ensureOpsLoaded = vi.fn()
const routerPush = vi.hoisted(() => vi.fn())

const boxesStore = {
  box: mockBox,
  loading: mockBoxLoading,
  getById: boxGetById,
  create: boxCreate,
  update: boxUpdate
}

const registersStore = {
  item: mockRegister,
  loading: mockRegisterLoading,
  getById: registerGetById,
  ensureOpsLoaded,
  getTransportationDocument: vi.fn(() => 'Авианакладная')
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) =>
      store.box !== undefined
        ? { box: mockBox, loading: mockBoxLoading }
        : { item: mockRegister, loading: mockRegisterLoading }
  }
})

vi.mock('@/stores/boxes.store.js', () => ({ useBoxesStore: () => boxesStore }))
vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => registersStore }))
vi.mock('@/router', () => ({ default: { push: routerPush } }))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    warning: (message, options = {}) => {
      mockAlert.value = { message, action: options.action }
    },
    error: (error, options = {}) => {
      mockAlert.value = {
        message: error?.message || error || options.fallback,
        action: options.action
      }
    }
  })
}))

vi.mock('@/components/PageAlertRegion.vue', () => ({
  default: {
    setup: () => ({ mockAlert }),
    template:
      '<div data-testid="page-alert-region"><span>{{ mockAlert?.message }}</span><button v-if="mockAlert?.action" data-testid="alert-retry" @click="mockAlert.action.handler()">Повторить</button></div>'
  }
}))

const AsyncHost = {
  components: { BoxEditDialog },
  props: ['mode', 'registerId', 'boxId'],
  template: `
    <Suspense>
      <BoxEditDialog :mode="mode" :register-id="registerId" :box-id="boxId" />
    </Suspense>
  `
}

async function mountDialog(props) {
  const wrapper = mount(AsyncHost, {
    props,
    global: { stubs: defaultGlobalStubs }
  })
  await flushPromises()
  return wrapper
}

describe('Box_EditDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAlert.value = null
    mockRegister.value = {
      id: 42,
      dealNumber: 'DEAL-42',
      invoiceNumber: 'INV-42',
      transportationTypeCode: 1,
      readOnly: false,
      realWeightKg: 0
    }
    mockBox.value = {
      id: 7,
      registerId: 42,
      code: 'BOX-7',
      lengthCm: 10,
      widthCm: 20,
      heightCm: 30,
      weightKg: 4.125
    }
    ensureOpsLoaded.mockResolvedValue()
    registerGetById.mockResolvedValue(mockRegister.value)
    boxGetById.mockResolvedValue(mockBox.value)
    boxCreate.mockResolvedValue({ ...mockBox.value })
    boxUpdate.mockResolvedValue()
    routerPush.mockResolvedValue()
  })

  it('creates a box with trimmed code and normalized optional metrics', async () => {
    const wrapper = await mountDialog({ mode: 'create', registerId: 42 })
    const dialog = wrapper.findComponent(BoxEditDialog)

    expect(registerGetById).toHaveBeenCalledWith(42)
    expect(boxGetById).not.toHaveBeenCalled()
    expect(wrapper.get('h1').text()).toContain('cоздание коробки')

    await dialog.vm.onSubmit(
      {
        code: '  BOX-NEW  ',
        lengthCm: '10.5',
        widthCm: '',
        heightCm: null,
        weightKg: '4.125'
      },
      { setErrors: vi.fn() }
    )

    expect(boxCreate).toHaveBeenCalledWith({
      registerId: 42,
      code: 'BOX-NEW',
      lengthCm: 10.5,
      widthCm: null,
      heightCm: null,
      weightKg: 4.125
    })
    expect(routerPush).toHaveBeenCalledWith('/registers/42/boxes')
  })

  it('keeps the code immutable and omits weight when the register has real weight', async () => {
    mockRegister.value = { ...mockRegister.value, realWeightKg: 100 }
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    const dialog = wrapper.findComponent(BoxEditDialog)

    expect(boxGetById).toHaveBeenCalledWith(7)
    expect(wrapper.get('#code').attributes()).toHaveProperty('readonly')
    expect(wrapper.get('[data-testid="box-weight-input"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('[data-testid="box-weight-disabled-hint"]').text()).toContain(
      'рассчитывается автоматически'
    )

    await dialog.vm.onSubmit(
      {
        code: 'CHANGED',
        lengthCm: '11',
        widthCm: '22',
        heightCm: '33',
        weightKg: '99'
      },
      { setErrors: vi.fn() }
    )

    expect(boxUpdate).toHaveBeenCalledWith(7, {
      lengthCm: 11,
      widthCm: 22,
      heightCm: 33
    })
    expect(routerPush).toHaveBeenCalledWith('/registers/42/boxes')
  })

  it('blocks mutations and presents a warning for a read-only register', async () => {
    mockRegister.value = { ...mockRegister.value, readOnly: true }
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    const dialog = wrapper.findComponent(BoxEditDialog)

    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain(
      'Изменения запрещены'
    )
    const save = wrapper
      .findAllComponents(ActionButton)
      .find((item) => item.props('tooltipText') === 'Сохранить')
    expect(save.props('disabled')).toBe(true)

    expect(await dialog.vm.onSubmit({ code: 'BOX-7' }, { setErrors: vi.fn() })).toBe(false)
    expect(boxUpdate).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('keeps entered values visible after failure and supports retry', async () => {
    const error = new Error('save failed')
    error.status = 500
    boxCreate.mockRejectedValueOnce(error).mockResolvedValue(mockBox.value)
    const wrapper = await mountDialog({ mode: 'create', registerId: 42 })
    const dialog = wrapper.findComponent(BoxEditDialog)
    await wrapper.get('#code').setValue('BOX-RETRY')

    const values = {
      code: 'BOX-RETRY',
      lengthCm: '10',
      widthCm: '',
      heightCm: '',
      weightKg: ''
    }
    expect(await dialog.vm.onSubmit(values, { setErrors: vi.fn() })).toBe(false)
    await flushPromises()

    expect(routerPush).not.toHaveBeenCalled()
    expect(wrapper.get('#code').element.value).toBe('BOX-RETRY')
    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('save failed')

    expect(await dialog.vm.onSubmit(values, { setErrors: vi.fn() })).toBe(true)
    expect(boxCreate).toHaveBeenCalledTimes(2)
    expect(routerPush).toHaveBeenCalledWith('/registers/42/boxes')
  })

  it('shows a friendly duplicate-code conflict without navigating', async () => {
    const error = new Error('Коробка с таким номером уже существует')
    error.status = 409
    boxCreate.mockRejectedValueOnce(error)
    const wrapper = await mountDialog({ mode: 'create', registerId: 42 })
    const dialog = wrapper.findComponent(BoxEditDialog)

    await dialog.vm.onSubmit(
      { code: 'BOX-7', lengthCm: '', widthCm: '', heightCm: '', weightKg: '' },
      { setErrors: vi.fn() }
    )
    await flushPromises()

    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain(
      'Коробка с таким номером уже существует'
    )
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('renders field validation below an empty required code', async () => {
    const wrapper = await mountDialog({ mode: 'create', registerId: 42 })
    const save = wrapper
      .findAllComponents(ActionButton)
      .find((item) => item.props('tooltipText') === 'Создать')
    expect(save.find('button').attributes('type')).toBe('submit')
    const result = await wrapper.findComponent(Form).vm.$.exposed.validate()
    await flushPromises()

    expect(result.valid).toBe(false)
    expect(wrapper.text()).toContain('Номер коробки обязателен')
    expect(boxCreate).not.toHaveBeenCalled()
  })

  it('returns to the register box list when cancelled', async () => {
    const wrapper = await mountDialog({ mode: 'create', registerId: 42 })
    const cancel = wrapper
      .findAllComponents(ActionButton)
      .find((item) => item.props('tooltipText') === 'Отменить')

    await cancel.find('button').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/registers/42/boxes')
  })

  it('shows retry for a failed load and renders the form after retry', async () => {
    boxGetById.mockRejectedValueOnce(new Error('load failed')).mockResolvedValue(mockBox.value)
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })

    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('load failed')
    expect(wrapper.find('#code').exists()).toBe(false)

    await wrapper.get('[data-testid="alert-retry"]').trigger('click')
    await flushPromises()

    expect(boxGetById).toHaveBeenCalledTimes(2)
    expect(wrapper.get('#code').element.value).toBe('BOX-7')
  })

  it('rejects an edit URL whose box belongs to another register', async () => {
    mockBox.value = { ...mockBox.value, registerId: 99 }
    boxGetById.mockResolvedValue(mockBox.value)
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })

    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain(
      'Коробка не принадлежит выбранному реестру'
    )
    expect(wrapper.find('#code').exists()).toBe(false)
  })
})
