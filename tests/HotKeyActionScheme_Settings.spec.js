/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import HotKeyActionSchemeSettings from '@/dialogs/HotKeyActionScheme_Settings.vue'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

const schemeRef = ref({
  id: 1,
  name: 'Default',
  actions: [
    { id: 1, action: 1, keyCode: 'F1', shift: false, ctrl: false, alt: false, schemeId: 1 },
    { id: 2, action: 2, keyCode: 'F2', shift: true, ctrl: false, alt: false, schemeId: 1 }
  ]
})

const opsRef = ref({
  actions: [
    { value: 1, name: 'Action 1', event: 'action1' },
    { value: 2, name: 'Action 2', event: 'action2' },
    { value: 3, name: 'Action 3', event: 'action3' }
  ]
})

const getByIdMock = vi.hoisted(() => vi.fn())
const createMock = vi.hoisted(() => vi.fn())
const updateMock = vi.hoisted(() => vi.fn())
const ensureOpsLoadedMock = vi.hoisted(() => vi.fn())
const getOpsLabelMock = vi.hoisted(() => vi.fn())
const pushMock = vi.hoisted(() => vi.fn())

let storeMock

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => ({
      hotKeyActionScheme: store.hotKeyActionScheme,
      ops: store.ops
    })
  }
})

vi.mock('@/stores/hotkey.action.schemes.store.js', () => ({
  useHotKeyActionSchemesStore: () => storeMock
}))

vi.mock('@/router', () => ({ default: { push: pushMock } }), { virtual: true })

const AsyncWrapper = {
  components: { HotKeyActionSchemeSettings },
  props: ['mode', 'hotKeyActionSchemeId'],
  template: '<Suspense><HotKeyActionSchemeSettings :mode="mode" :hot-key-action-scheme-id="hotKeyActionSchemeId" /></Suspense>'
}

describe('HotKeyActionScheme_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getOpsLabelMock.mockImplementation((list, value) => {
      const action = list?.find(a => a.value === value)
      return action ? action.name : `Action ${value}`
    })
    ensureOpsLoadedMock.mockResolvedValue(opsRef.value)
    storeMock = {
      hotKeyActionScheme: schemeRef,
      ops: opsRef,
      getById: getByIdMock.mockResolvedValue(schemeRef.value),
      create: createMock.mockResolvedValue({ id: 2, name: 'New' }),
      update: updateMock.mockResolvedValue(true),
      ensureOpsLoaded: ensureOpsLoadedMock,
      getOpsLabel: getOpsLabelMock
    }
  })

  it('loads ops data on mount', async () => {
    mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    expect(ensureOpsLoadedMock).toHaveBeenCalled()
  })

  it('loads item in edit mode', async () => {
    mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    expect(getByIdMock).toHaveBeenCalledWith(1)
  })

  it('initializes actions from ops in create mode', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const vm = wrapper.findComponent(HotKeyActionSchemeSettings).vm
    expect(vm.hotKeyActionScheme.actions).toHaveLength(3)
    expect(vm.hotKeyActionScheme.actions[0].action).toBe(1)
    expect(vm.hotKeyActionScheme.actions[0].keyCode).toBe('')
    expect(vm.hotKeyActionScheme.actions[0].shift).toBe(false)
  })

  it('uses backend data for actions in edit mode', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const vm = wrapper.findComponent(HotKeyActionSchemeSettings).vm
    expect(vm.hotKeyActionScheme.actions).toHaveLength(2)
    expect(vm.hotKeyActionScheme.actions[0].keyCode).toBe('F1')
    expect(vm.hotKeyActionScheme.actions[1].keyCode).toBe('F2')
    expect(vm.hotKeyActionScheme.actions[1].shift).toBe(true)
  })

  it('renders action names using getOpsLabel', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const table = wrapper.find('.actions-table')
    expect(table.exists()).toBe(true)
    expect(getOpsLabelMock).toHaveBeenCalled()
  })

  it('renders input fields for keyCode', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const inputs = wrapper.findAll('input[type="text"]')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('renders checkboxes for shift, ctrl, alt', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(6) // 3 columns * 2 rows minimum
  })

  it('renders editable keyCode inputs', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const inputs = wrapper.findAll('input.input-sm')
    expect(inputs.length).toBe(2) // Should match the number of actions
    expect(inputs[0].element.value).toBe('F1')
    expect(inputs[1].element.value).toBe('F2')
  })

  it('renders editable checkboxes', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const shiftCheckbox = wrapper.find('input[id="shift-0"]')
    const ctrlCheckbox = wrapper.find('input[id="ctrl-0"]')
    const altCheckbox = wrapper.find('input[id="alt-0"]')
    
    expect(shiftCheckbox.exists()).toBe(true)
    expect(ctrlCheckbox.exists()).toBe(true)
    expect(altCheckbox.exists()).toBe(true)
    
    // Verify initial checkbox states
    expect(shiftCheckbox.element.checked).toBe(false)
  })

  it('submits create with actions data', async () => {
    const createWrapper = mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const vm = createWrapper.findComponent(HotKeyActionSchemeSettings).vm
    vm.hotKeyActionScheme.actions[0].keyCode = 'F10'
    vm.hotKeyActionScheme.actions[0].shift = true
    
    await createWrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'New Scheme' }, { setErrors: vi.fn() })
    await resolveAll()

    expect(createMock).toHaveBeenCalled()
    const callArg = createMock.mock.calls[0][0]
    expect(callArg.name).toBe('New Scheme')
    expect(callArg.actions).toBeDefined()
    expect(Array.isArray(callArg.actions)).toBe(true)
    expect(callArg.actions[0].keyCode).toBe('F10')
    expect(callArg.actions[0].shift).toBe(true)
  })

  it('submits edit with actions data', async () => {
    const editWrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const vm = editWrapper.findComponent(HotKeyActionSchemeSettings).vm
    vm.hotKeyActionScheme.actions[0].keyCode = 'F11'
    vm.hotKeyActionScheme.actions[0].ctrl = true
    
    await editWrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'Updated Scheme' }, { setErrors: vi.fn() })
    await resolveAll()

    expect(updateMock).toHaveBeenCalled()
    const callArg = updateMock.mock.calls[0][1]
    expect(callArg.name).toBe('Updated Scheme')
    expect(callArg.actions).toBeDefined()
    expect(Array.isArray(callArg.actions)).toBe(true)
    expect(callArg.actions[0].keyCode).toBe('F11')
    expect(callArg.actions[0].ctrl).toBe(true)
  })

  it('sets api error for create conflict', async () => {
    const setErrors = vi.fn()
    createMock.mockRejectedValueOnce(new Error('409 Conflict'))

    const wrapper = mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    await wrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'Ops' }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: 'Схема настройки клавиатуры с таким названием уже существует' })
  })

  it('sets api error for edit failures', async () => {
    const setErrors = vi.fn()
    updateMock.mockRejectedValueOnce(new Error('Ошибка при сохранении схемы настройки клавиатуры'))

    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    await wrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'Ops' }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: 'Ошибка при сохранении схемы настройки клавиатуры' })
  })

  it('sets api error for create generic error', async () => {
    const setErrors = vi.fn()
    createMock.mockRejectedValueOnce(new Error('Network error'))

    const wrapper = mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    await wrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'Ops' }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: 'Network error' })
  })

  it('handles missing actions array in edit mode', async () => {
    const schemeWithoutActions = ref({ id: 1, name: 'No Actions' })
    storeMock.hotKeyActionScheme = schemeWithoutActions
    getByIdMock.mockResolvedValueOnce(schemeWithoutActions.value)

    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const vm = wrapper.findComponent(HotKeyActionSchemeSettings).vm
    expect(vm.hotKeyActionScheme.actions).toBeDefined()
    expect(Array.isArray(vm.hotKeyActionScheme.actions)).toBe(true)
  })

  it('displays correct title for create mode', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    expect(wrapper.text()).toContain('Создание схемы настройки клавиатуры')
  })

  it('displays correct title for edit mode', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    expect(wrapper.text()).toContain('Изменение схемы настройки клавиатуры')
  })

  it('displays correct button text for create mode', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    expect(wrapper.text()).toContain('Создать')
  })

  it('displays correct button text for edit mode', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    expect(wrapper.text()).toContain('Сохранить')
  })

  it('applies checkbox-styled class to checkboxes', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const checkboxes = wrapper.findAll('.checkbox-styled')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('renders table with correct structure', async () => {
    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    
    const table = wrapper.find('.actions-table table')
    expect(table.exists()).toBe(true)
    
    const thead = table.find('thead')
    expect(thead.exists()).toBe(true)
    
    const headerCells = thead.findAll('th')
    expect(headerCells.length).toBe(5) // Action, KeyCode, Shift, Ctrl, Alt
    expect(headerCells[0].text()).toBe('Действие')
    expect(headerCells[1].text()).toBe('Клавиша')
    expect(headerCells[2].text()).toBe('Shift')
    expect(headerCells[3].text()).toBe('Ctrl')
    expect(headerCells[4].text()).toBe('Alt')
  })
})
