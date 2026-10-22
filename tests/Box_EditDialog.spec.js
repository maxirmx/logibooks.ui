/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import BoxEditDialog from '@/dialogs/Box_EditDialog.vue'
import ActionButton from '@/components/ActionButton.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const printBoxLabel = vi.hoisted(() => vi.fn())
vi.mock('@/components/LocalLabelPrinting.vue', () => ({ default: {
  template: '<div data-testid="box-printing-panel" />',
  setup(_props, { expose }) { expose({ busy: false, printParcel: printBoxLabel }) }
} }))
const mockBox = ref(null)
const mockBoxLoading = ref(false)
const mockRegister = ref({})
const mockRegisterLoading = ref(false)
const mockAlert = ref(null)
const mockIsAdmin = ref(false)

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
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ get isAdmin() { return mockIsAdmin.value } }) }))
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

const mountedDialogs = []
afterEach(() => {
  for (const wrapper of mountedDialogs) {
    if (wrapper.exists()) wrapper.unmount()
  }
  mountedDialogs.length = 0
})

async function mountDialog(props) {
  const wrapper = mount(AsyncHost, {
    props,
    global: { stubs: defaultGlobalStubs }
  })
  mountedDialogs.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('Box_EditDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAlert.value = null
    mockIsAdmin.value = false
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

  it('shows the sticker read-only for non-administrators and prints without submitting the form', async () => {
    mockBox.value = { ...mockBox.value, companyId: 2, registerType: 2097154,
      boxSticker: '$1:1:4542503776:362877', printableTemplates: ['WBR_BOX'] }
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    const sticker = wrapper.get('[data-testid="box-sticker-input"]')
    expect(wrapper.get('label[for="boxSticker"]').text()).toBe('Код стикера:')
    expect(sticker.element.value).toBe('$1:1:4542503776:362877')
    expect(sticker.element.readOnly).toBe(true)
    const printGroup = wrapper.get('[data-testid="box-sticker-print-actions"]')
    expect(printGroup.findAll('button')).toHaveLength(1)
    expect(printGroup.element).not.toBe(wrapper.get('[data-testid="box-save-action"]').element.closest('.header-actions'))
    expect(wrapper.find('[data-testid="box-sticker-field"]').exists()).toBe(false)
    const action = wrapper.findAllComponents(ActionButton).find((item) => item.props('tooltipText') === 'Печать стикера')
    expect(action.props('disabled')).toBe(false)
    expect(action.props('iconSize')).toBe('2x')
    await action.get('button').trigger('click')
    expect(printBoxLabel).toHaveBeenCalledWith({ boxId: 7, template: 'WBR_BOX' })
    expect(boxUpdate).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it.each([null, 'previous scan'])('allows an administrator to enter a sticker over %s and save it', async (previous) => {
    mockIsAdmin.value = true
    mockBox.value.boxSticker = previous
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    const sticker = wrapper.get('[data-testid="box-sticker-input"]')
    expect(sticker.element.readOnly).toBe(false)
    await sticker.setValue('  $1:1:BOX-7:362877  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => expect(boxUpdate).toHaveBeenCalledWith(7, expect.objectContaining({ boxSticker: '$1:1:BOX-7:362877' })))
    expect(routerPush).toHaveBeenCalledWith('/registers/42/boxes')
  })
  it.each(['replacement sticker', '', '   '])('blocks printing an unsaved sticker %j and restores printing when the edit is reverted', async (draft) => {
    mockIsAdmin.value = true
    const saved = '$1:1:4542503776:362877'
    mockBox.value = { ...mockBox.value, companyId: 2, boxSticker: saved, printableTemplates: ['WBR_BOX'] }
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    const print = wrapper.get('button[data-testid="box-print-label"]')
    const sticker = wrapper.get('[data-testid="box-sticker-input"]')
    expect(print.element.disabled).toBe(false)
    await sticker.setValue(draft); await flushPromises()
    expect(print.element.disabled).toBe(true)
    await print.trigger('click')
    expect(printBoxLabel).not.toHaveBeenCalled()
    expect(boxUpdate).not.toHaveBeenCalled()
    await sticker.setValue(saved); await flushPromises()
    expect(print.element.disabled).toBe(false)
    await print.trigger('click')
    expect(printBoxLabel).toHaveBeenCalledExactlyOnceWith({ boxId: 7, template: 'WBR_BOX' })
  })
  it('keeps printing disabled after a rejected sticker save and retries the draft without printing stale data', async () => {
    mockIsAdmin.value = true
    mockBox.value = { ...mockBox.value, companyId: 2, boxSticker: 'saved sticker', printableTemplates: ['WBR_BOX'] }
    boxUpdate.mockRejectedValueOnce(new Error('Не удалось сохранить код стикера'))
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    await wrapper.get('[data-testid="box-sticker-input"]').setValue('replacement sticker')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    await vi.waitFor(() => expect(boxUpdate).toHaveBeenCalledTimes(1))
    expect(routerPush).not.toHaveBeenCalled()
    expect(wrapper.text().match(/Не удалось сохранить код стикера/g)).toHaveLength(1)
    expect(wrapper.get('[data-testid="box-sticker-input"]').element.value).toBe('replacement sticker')
    const print = wrapper.get('button[data-testid="box-print-label"]')
    expect(print.element.disabled).toBe(true)
    await print.trigger('click')
    expect(printBoxLabel).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit'); await flushPromises()
    await vi.waitFor(() => expect(boxUpdate).toHaveBeenCalledTimes(2))
    expect(boxUpdate).toHaveBeenLastCalledWith(7, expect.objectContaining({ boxSticker: 'replacement sticker' }))
    expect(routerPush).toHaveBeenCalledWith('/registers/42/boxes')
  })

  it('allows an administrator to clear a sticker, but omits unchanged values', async () => {
    mockIsAdmin.value = true
    mockBox.value.boxSticker = 'saved'
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    const dialog = wrapper.findComponent(BoxEditDialog)
    await dialog.vm.onSubmit({ ...dialog.vm.initialValues })
    expect(boxUpdate.mock.calls[0][1]).not.toHaveProperty('boxSticker')
    await wrapper.get('[data-testid="box-sticker-input"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => expect(boxUpdate).toHaveBeenLastCalledWith(7, expect.objectContaining({ boxSticker: null })))
  })

  it('never sends a sticker supplied by a non-administrator', async () => {
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    const dialog = wrapper.findComponent(BoxEditDialog)
    await dialog.vm.onSubmit({ ...dialog.vm.initialValues, boxSticker: 'forged', lengthCm: 15 })
    expect(boxUpdate).toHaveBeenCalledWith(7, expect.objectContaining({ lengthCm: 15 }))
    expect(boxUpdate.mock.calls[0][1]).not.toHaveProperty('boxSticker')
  })

  it('keeps the administrator sticker read-only for a locked register', async () => {
    mockIsAdmin.value = true
    mockRegister.value.readOnly = true
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    expect(wrapper.get('[data-testid="box-sticker-input"]').element.readOnly).toBe(true)
    expect(wrapper.get('[data-testid="box-sticker-input"]').element.disabled).toBe(true)
  })

  it('preserves an edited sticker after a rejected save and retries without duplicate errors', async () => {
    mockIsAdmin.value = true
    boxUpdate.mockRejectedValueOnce(new Error('Недостаточно прав для выполнения операции'))
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    await wrapper.get('[data-testid="box-sticker-input"]').setValue('manual sticker')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => expect(boxUpdate).toHaveBeenCalledTimes(1))
    expect(routerPush).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="box-sticker-input"]').element.value).toBe('manual sticker')
    expect(wrapper.text().match(/Недостаточно прав для выполнения операции/g)).toHaveLength(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => expect(boxUpdate).toHaveBeenCalledTimes(2))
    expect(boxUpdate).toHaveBeenLastCalledWith(7, expect.objectContaining({ boxSticker: 'manual sticker' }))
    expect(routerPush).toHaveBeenCalledWith('/registers/42/boxes')
  })

  it.each([
    [1, '$1:1:4542503776:362877', ['WBR_BOX']],
    [2, null, ['WBR_BOX']],
    [2, '$1:1:4542503776:362877', []]
  ])('keeps the unavailable print button visible in box editing for company %s', async (companyId, boxSticker, printableTemplates) => {
    mockBox.value = { ...mockBox.value, companyId, boxSticker, printableTemplates }
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    expect(wrapper.get('[data-testid="box-printing-panel"]').isVisible()).toBe(true)
    const button = wrapper.get('button[data-testid="box-print-label"]')
    expect(button.isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="box-sticker-input"]').element.value).toBe(boxSticker || '')
    expect(button.element.disabled).toBe(true)
    await button.trigger('click')
    expect(printBoxLabel).not.toHaveBeenCalled()
    expect(boxUpdate).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('creates a box with trimmed code and normalized optional metrics', async () => {
    const wrapper = await mountDialog({ mode: 'create', registerId: 42 })
    const dialog = wrapper.findComponent(BoxEditDialog)

    expect(registerGetById).toHaveBeenCalledWith(42)
    expect(boxGetById).not.toHaveBeenCalled()
    expect(wrapper.get('h1').text()).toContain('создание коробки')

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

  it('returns to the register box list when cancelled', async () => {
    const wrapper = await mountDialog({ mode: 'create', registerId: 42 })
    const cancel = wrapper
      .findAllComponents(ActionButton)
      .find((item) => item.props('tooltipText') === 'Отменить')

    await cancel.find('button').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/registers/42/boxes')
  })

  it('shows retry after an uncached box fails to load and renders the form after retry', async () => {
    const loadedBox = mockBox.value
    mockBox.value = null
    boxGetById.mockRejectedValueOnce(new Error('load failed')).mockImplementation(async () => {
      mockBox.value = loadedBox
      return loadedBox
    })
    const wrapper = await mountDialog({ mode: 'edit', registerId: 42, boxId: 7 })
    const dialog = wrapper.findComponent(BoxEditDialog)
    const save = wrapper
      .findAllComponents(ActionButton)
      .find((item) => item.props('tooltipText') === 'Сохранить')

    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('load failed')
    expect(wrapper.find('#code').exists()).toBe(false)
    expect(wrapper.find('[data-testid="box-sticker-input"]').exists()).toBe(false)
    expect(wrapper.get('button[data-testid="box-print-label"]').element.disabled).toBe(true)
    expect(save.props('disabled')).toBe(true)
    expect(
      await dialog.vm.onSubmit(
        { code: 'STALE-BOX', lengthCm: 1, widthCm: 2, heightCm: 3, weightKg: 4 },
        { setErrors: vi.fn() }
      )
    ).toBe(false)
    expect(boxUpdate).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="alert-retry"]').trigger('click')
    await flushPromises()

    expect(boxGetById).toHaveBeenCalledTimes(2)
    expect(wrapper.get('#code').element.value).toBe('BOX-7')
    const retriedSave = wrapper
      .findAllComponents(ActionButton)
      .find((item) => item.props('tooltipText') === 'Сохранить')
    expect(retriedSave.props('disabled')).toBe(false)
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
