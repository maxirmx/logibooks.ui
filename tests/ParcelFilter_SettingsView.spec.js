/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ParcelFilterSettingsView from '@/views/ParcelFilter_SettingsView.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { reportError } from '@/helpers/error.helpers.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'

const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', async () => ({ ...await vi.importActual('vue-router'), useRouter: () => ({ push }) }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ user: { id: 7 } }) }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('@/helpers/error.helpers.js', async importOriginal => ({ ...await importOriginal(), reportError: vi.fn() }))

const registerOps = {
  customsProcedures: [], transportationTypes: [], incoterms: [{ value: 1, name: 'EXW' }],
  passportCheckStatuses: [{ value: 30, code: 'NotExists', name: 'Несуществующий' }]
}
const filter = {
  id: 1, name: 'Мой фильтр', excludedParcelStatusIds: [2],
  excludedCheckStatuses: { common: [381], sw: [256], fc: [256] },
  excludedPassportCheckStatuses: [30]
}
const copy = value => JSON.parse(JSON.stringify(value))
const ActionButton = {
  props: ['item', 'disabled', 'tooltipText'], emits: ['click'],
  template: '<button type="button" :disabled="disabled" :aria-label="tooltipText" @click="$emit(\'click\', item)"></button>'
}
function mountView(props) {
  const pinia = createPinia()
  const wrapper = mount(ParcelFilterSettingsView, { props, global: { plugins: [pinia], stubs: { ActionButton } } })
  return { wrapper, alertStore: useAlertStore(pinia) }
}
beforeEach(() => {
  reportError.mockReset()
  push.mockReset().mockResolvedValue()
  fetchWrapper.get.mockReset().mockImplementation(url => {
    if (url.endsWith('/parcelstatuses')) return Promise.resolve([{ id: 2, title: 'Реальный статус' }])
    if (url.endsWith('/registers/ops')) return Promise.resolve(copy(registerOps))
    if (url.endsWith('/parcel-filters')) return Promise.resolve([copy(filter)])
    return url.endsWith('/1') ? Promise.resolve(copy(filter)) : Promise.reject(Object.assign(new Error('Фильтр не найден'), { status: 404 }))
  })
  fetchWrapper.post.mockReset().mockResolvedValue({ ...copy(filter), id: 3 })
  fetchWrapper.put.mockReset().mockResolvedValue(undefined)
})

describe('ParcelFilter_SettingsView', () => {
  it.each(['unmount', 'reuse'])('preserves the current alert when navigation rejects after %s', async change => {
    let rejectNavigation
    push.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectNavigation = reject }))
    const { wrapper, alertStore } = mountView({ mode: 'create' })
    await flushPromises()
    const navigate = wrapper.vm.returnToProfile
    const pinia = wrapper.vm.$pinia
    await wrapper.get('[data-testid="parcel-filter-back"]').trigger('click')
    let destination = wrapper
    if (change === 'reuse') {
      await wrapper.setProps({ mode: 'edit', id: 999 })
      await flushPromises()
    } else {
      wrapper.unmount()
      destination = mount(PageAlertRegion, { global: { plugins: [pinia] } })
    }
    alertStore.error('Current page alert')
    await flushPromises()
    const failure = new Error('Abandoned editor navigation')
    rejectNavigation(failure)
    await flushPromises()
    expect(destination.get('[role="alert"]').text()).toContain('Current page alert')
    expect(destination.text()).not.toContain('Abandoned editor navigation')
    expect(reportError).toHaveBeenCalledWith(failure, { context: 'parcel filter profile navigation after editor change' })
    if (change === 'unmount') {
      expect(await navigate()).toBe(false)
      expect(push).toHaveBeenCalledOnce()
    }
    destination.unmount()
  })
  it('groups existing check-status definitions and loads shared status metadata', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    expect(wrapper.findAll('fieldset')).toHaveLength(5)
    expect(wrapper.find('[data-testid="parcel-filter-statuses"]').text()).toContain('Реальный статус')
    expect(wrapper.find('[data-testid="parcel-filter-passport"]').text()).toContain('Несуществующий')
    expect(wrapper.find('[data-testid="parcel-filter-common"]').text()).toContain('Согл. с акцизом')
    expect(wrapper.find('[data-testid="parcel-filter-sw"]').text()).toContain('Стоп слово')
    expect(wrapper.find('[data-testid="parcel-filter-fc"]').text()).toContain('Стоп ТН ВЭД')
    expect(wrapper.find('[data-testid="parcel-filter-sw"]').text()).toContain('🔖 Ок стоп слова')
    expect(wrapper.findAll('[data-testid="parcel-filter-common"] input').map(input => Number(input.element.value)))
      .toEqual([380, 381, 511, 560, 561, 562])
    expect(wrapper.findAll('[data-testid="parcel-filter-sw"] input').map(input => Number(input.element.value)))
      .toEqual([0, 16, 32, 144, 160, 256, 384])
    expect(wrapper.findAll('[data-testid="parcel-filter-fc"] input').map(input => Number(input.element.value)))
      .toEqual([0, 16, 256, 257, 258])
    expect(fetchWrapper.get.mock.calls.some(([url]) => url.endsWith('/parcel-filters/options'))).toBe(false)
    expect(wrapper.findAll('.parcel-filter-settings__left-column legend').map(item => item.text())).toEqual([
      'Общие статусы проверки', 'Проверка стоп-слов', 'Проверка ТН ВЭД', 'Проверка паспорта'
    ])
    expect(wrapper.find('[data-testid="parcel-filter-common"] input:disabled').element.checked).toBe(true)
    expect(wrapper.find('[data-testid="parcel-filter-common"]').text()).toContain('Исключено партнёром')
    expect(wrapper.vm.draft.excludedCheckStatuses.common).toEqual([])
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
  })

  it('uses the passport statuses and labels already provided by registers ops', async () => {
    const originalGet = fetchWrapper.get.getMockImplementation()
    fetchWrapper.get.mockImplementation(url => url.endsWith('/registers/ops')
      ? Promise.resolve({ ...registerOps, passportCheckStatuses: [
          { value: 30, code: 'NotExists', name: 'Текст из ops' },
          { value: 20, code: 'Checked', name: 'Проверен' }
        ] })
      : originalGet(url))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    expect(wrapper.find('[data-testid="parcel-filter-passport"]').text()).toContain('Текст из ops')
    expect(wrapper.find('[data-testid="parcel-filter-passport"]').text()).toContain('Проверен')
    expect(wrapper.findAll('[data-testid="parcel-filter-passport"] input')).toHaveLength(2)
  })

  it('presents ops rejection once and loads the form after retry', async () => {
    const originalGet = fetchWrapper.get.getMockImplementation()
    fetchWrapper.get.mockImplementation(url => url.endsWith('/registers/ops')
      ? Promise.reject(new Error('Ops недоступны'))
      : originalGet(url))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Ops недоступны')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    expect(push).not.toHaveBeenCalled()
    fetchWrapper.get.mockImplementation(originalGet)
    await wrapper.find('[data-testid="page-alert-region"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="parcel-filter-passport"]').text()).toContain('Несуществующий')
    expect(fetchWrapper.get.mock.calls.filter(([url]) => url.endsWith('/registers/ops'))).toHaveLength(2)
  })

  it('disables Save for empty, long, and duplicate names', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    const name = wrapper.find('[data-testid="parcel-filter-name"]')
    await name.setValue('   ')
    expect(wrapper.find('[role="alert"]').text()).toContain('Укажите название')
    await name.setValue('x'.repeat(101))
    expect(wrapper.find('[role="alert"]').text()).toContain('100 символов')
    await name.setValue(' МОЙ ФИЛЬТР ')
    expect(wrapper.find('[role="alert"]').text()).toContain('уже есть')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    await name.setValue('Новый фильтр')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeUndefined()
  })

  it('creates an empty filter and navigates after persistence', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('  Новый фильтр  ')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/parcel-filters'), {
      name: 'Новый фильтр', excludedParcelStatusIds: [],
      excludedCheckStatuses: { common: [], sw: [], fc: [] },
      excludedPassportCheckStatuses: []
    })
    expect(push).toHaveBeenCalledWith('/user/edit/7')
  })

  it('submits selected parcel and check statuses without the locked partner code', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Выбор')
    for (const [key, value] of [['common', 380], ['sw', 256], ['fc', 256], ['passport', 30], ['statuses', 2]]) {
      await wrapper.find(`[data-testid="parcel-filter-${key}"] input[value="${value}"]`).setValue(true)
    }
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    const payload = fetchWrapper.post.mock.calls[0][1]
    expect(payload.excludedParcelStatusIds).toEqual([2])
    expect(payload.excludedCheckStatuses).toEqual({ common: [380], sw: [256], fc: [256] })
    expect(payload.excludedPassportCheckStatuses).toEqual([30])
    expect(payload.excludedCheckStatuses.common).not.toContain(0x01ff)
  })

  it('loads and updates all exclusion categories', async () => {
    const { wrapper } = mountView({ mode: 'edit', id: 1 })
    await flushPromises()
    expect(wrapper.find('[data-testid="parcel-filter-name"]').element.value).toBe('Мой фильтр')
    expect(wrapper.find('[data-testid="parcel-filter-passport"] input').element.checked).toBe(true)
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Изменённый')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.put).toHaveBeenCalledWith(expect.stringMatching(/\/parcel-filters\/1$/), {
      name: 'Изменённый', excludedParcelStatusIds: [2],
      excludedCheckStatuses: { common: [381], sw: [256], fc: [256] },
      excludedPassportCheckStatuses: [30]
    })
    expect(push).toHaveBeenCalledWith('/user/edit/7')
  })

  it('clears passport exclusions while preserving parcel checks', async () => {
    const { wrapper } = mountView({ mode: 'edit', id: 1 })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-passport"] input').setValue(false)
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.put).toHaveBeenCalledWith(expect.stringMatching(/\/parcel-filters\/1$/), {
      name: 'Мой фильтр', excludedParcelStatusIds: [2],
      excludedCheckStatuses: { common: [381], sw: [256], fc: [256] },
      excludedPassportCheckStatuses: []
    })
  })

  it('preserves the draft on rejection and retries without premature navigation', async () => {
    fetchWrapper.post.mockRejectedValueOnce(new Error('Сервер недоступен'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Повторить')
    await wrapper.find('[data-testid="parcel-filter-passport"] input').setValue(true)
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Сервер недоступен')
    expect(wrapper.find('[data-testid="parcel-filter-name"]').element.value).toBe('Повторить')
    expect(wrapper.find('[data-testid="parcel-filter-passport"] input').element.checked).toBe(true)
    expect(push).not.toHaveBeenCalled()
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.post).toHaveBeenCalledTimes(2)
    expect(fetchWrapper.post.mock.calls[1][1].excludedPassportCheckStatuses).toEqual([30])
    expect(push).toHaveBeenCalledOnce()
  })

  it('places a 409 response with the name and keeps the form open', async () => {
    fetchWrapper.post.mockRejectedValueOnce(Object.assign(new Error('Фильтр с таким названием уже есть'), { status: 409 }))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Конфликт')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('уже есть')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(push).not.toHaveBeenCalled()
  })

  it('shows a missing filter with a working close action', async () => {
    const { wrapper } = mountView({ mode: 'edit', id: 999 })
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('не найден')
    await wrapper.find('[data-testid="parcel-filter-back"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/user/edit/7')
  })

  it('retries navigation without submitting the saved filter twice', async () => {
    push.mockRejectedValueOnce(new Error('Переход не удался'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Сохранённый')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Переход не удался')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    await wrapper.find('[data-testid="page-alert-region"] button').trigger('click')
    await flushPromises()
    expect(push).toHaveBeenCalledTimes(2)
    expect(fetchWrapper.post).toHaveBeenCalledOnce()
  })

  it('reloads on route reuse and does not publish a late save failure', async () => {
    const route = mountView({ mode: 'edit', id: 1 })
    await flushPromises()
    await route.wrapper.setProps({ mode: 'edit', id: 999 })
    await flushPromises()
    expect(route.wrapper.find('form').exists()).toBe(false)
    expect(route.wrapper.find('[data-testid="page-alert-region"]').text()).toContain('не найден')

    let rejectSave
    fetchWrapper.post.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSave = reject }))
    const saving = mountView({ mode: 'create' })
    await flushPromises()
    await saving.wrapper.find('[data-testid="parcel-filter-name"]').setValue('В процессе')
    await saving.wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    saving.wrapper.unmount()
    rejectSave(new Error('Позднее сохранение'))
    await flushPromises()
    expect(saving.alertStore.alert).toBeNull()
  })

  it('does not redirect after a save succeeds on an abandoned editor', async () => {
    let resolveSave
    fetchWrapper.post.mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve }))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('В процессе')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    wrapper.unmount()
    resolveSave({ ...filter, id: 3, name: 'В процессе' })
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
  })

  it('does not redirect or show an old save error when the route reuses the editor', async () => {
    let rejectSave
    fetchWrapper.put.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSave = reject }))
    const { wrapper } = mountView({ mode: 'edit', id: 1 })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await wrapper.setProps({ mode: 'edit', id: 999 })
    await flushPromises()
    rejectSave(new Error('Старое сохранение'))
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).not.toContain('Старое сохранение')
  })

  it('offers retry for load rejection and ignores a late rejection after unmount', async () => {
    fetchWrapper.get.mockRejectedValueOnce(new Error('Статусы недоступны'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Статусы недоступны')
    expect(wrapper.find('form').exists()).toBe(false)
    await wrapper.find('[data-testid="page-alert-region"] button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('fieldset')).toHaveLength(5)

    let rejectLoad
    fetchWrapper.get.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectLoad = reject }))
    const abandoned = mountView({ mode: 'create' })
    abandoned.wrapper.unmount()
    rejectLoad(new Error('Поздняя ошибка'))
    await flushPromises()
    expect(abandoned.alertStore.alert).toBeNull()
  })
})
