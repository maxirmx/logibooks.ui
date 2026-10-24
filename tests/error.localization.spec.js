// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import * as yup from 'yup'
import '@/helpers/validation.locale.js'
import { DEFAULT_ERROR_MESSAGE, getErrorMessage, getServerFieldErrors, reportFormError } from '@/helpers/error.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import FieldError from '@/components/FieldError.vue'
import ErrorDialog from '@/l2/ErrorDialog.vue'

const connectionError = 'Invocation canceled due to the underlying connection being closed.'
const connectionMessage = 'Соединение с сервером прервано. Обновите страницу и повторите операцию.'

describe('Russian error presentation', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([
    [connectionError, connectionMessage],
    ['Cannot send data if the connection is not in the Connected State.', connectionMessage],
    ['Request timed out', 'Сервер не ответил вовремя. Повторите операцию.'],
    ['Timeout', 'Сервер не ответил вовремя. Повторите операцию.'],
    ['Ошибка загрузки: Failed to fetch', 'Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.'],
    ['Load failed', 'Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.'],
    ['AbortError: The operation was aborted', 'Операция отменена.'],
    ['Unauthorized', 'Необходима авторизация. Войдите в систему снова.'],
    ['Access denied', 'Недостаточно прав для выполнения операции.'],
    ['SSL certificate error', 'Не удалось установить защищённое соединение с сервером. Обратитесь к администратору.'],
    ['Unexpected token in JSON', 'Сервер вернул данные в некорректном формате. Обновите страницу и повторите операцию.'],
    ['The Name field is required.', 'Обязательное поле'],
    ['Unknown technical diagnostic', DEFAULT_ERROR_MESSAGE],
    ["Register 'Партия' not found", DEFAULT_ERROR_MESSAGE],
    ['Ошибка: Some English diagnostic', DEFAULT_ERROR_MESSAGE],
    ['Ошибка: Failure', DEFAULT_ERROR_MESSAGE],
    ['Ошибка: Timeout', 'Сервер не ответил вовремя. Повторите операцию.'],
    ['Ошибка: Unauthorized', 'Необходима авторизация. Войдите в систему снова.'],
    ['Ошибка: Disconnected', connectionMessage],
    ['Компания «ACME Logistics» не найдена', 'Компания «ACME Logistics» не найдена'],
    ['Компания ACME Logistics не найдена', 'Компания ACME Logistics не найдена'],
    ['Не удалось обработать файл «Packing list.xlsx»', 'Не удалось обработать файл «Packing list.xlsx»'],
    ['Ошибка: «Failed to fetch»', 'Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.'],
    ['Ошибка печати: Connection closed', connectionMessage],
    ['Packing list доступен только для авиационной перевозки [реестр=12]', 'Packing list доступен только для авиационной перевозки [реестр=12]'],
    ['Компания Access denied не найдена', 'Компания Access denied не найдена'],
    ['Принтер Timeout недоступен', 'Принтер Timeout недоступен'],
    ['ACME Logistics: компания не найдена', 'ACME Logistics: компания не найдена'],
    ['Printer not found: Склад', 'Принтер не найден: Склад'],
    ['Printer not found: ACME Logistics', 'Принтер не найден: ACME Logistics'],
    ['Failed to connect to printer Склад', 'Не удалось подключиться к принтеру Склад'],
    ['Failed to connect to printer ACME Logistics', 'Не удалось подключиться к принтеру ACME Logistics'],
    ['Cannot read properties of Склад', DEFAULT_ERROR_MESSAGE],
    ['Реестр TJ-10 недоступен для редактирования', 'Реестр TJ-10 недоступен для редактирования'],
    ['QZ Tray недоступен. Запустите QZ Tray.', 'QZ Tray недоступен. Запустите QZ Tray.'],
    ['CMR доступна только для автомобильных реестров', 'CMR доступна только для автомобильных реестров']
  ])('normalizes %s', (message, expected) => {
    expect(getErrorMessage(new Error(message))).toBe(expected)
    expect(getErrorMessage(message)).toBe(expected)
  })

  it.each([
    { msg: connectionError }, { data: { msg: connectionError } },
    { data: { message: connectionError } }, { response: { data: { msg: connectionError } } },
    { response: { data: { message: connectionError } } }
  ])('normalizes nested API errors', error => expect(getErrorMessage(error)).toBe(connectionMessage))

  it('uses only Russian contextual fallbacks', () => {
    expect(getErrorMessage(new Error('Internal failure'), 'Не удалось сохранить реестр')).toBe('Не удалось сохранить реестр')
    expect(getErrorMessage(null, 'English fallback')).toBe(DEFAULT_ERROR_MESSAGE)
    expect(getErrorMessage({ message: ' ' }, '  ')).toBe(DEFAULT_ERROR_MESSAGE)
    expect(getErrorMessage(123)).toBe(DEFAULT_ERROR_MESSAGE)
  })

  it('renders one Russian alert for the reported SignalR failure and preserves the exception', () => {
    const error = new Error(connectionError)
    const store = useAlertStore()
    store.error(error, { title: 'Connection error' })
    const wrapper = mount(PageAlertRegion)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.text()).toContain(connectionMessage)
    expect(wrapper.text()).toContain('Ошибка')
    expect(wrapper.text()).not.toContain(connectionError)
    expect(error.message).toBe(connectionError)
    store.warning(error, { title: 'Warning' })
    expect(store.alert).toMatchObject({ message: connectionMessage, title: 'Предупреждение' })
    wrapper.unmount()
  })

  it.each(['error', 'warning'])('localizes mixed diagnostics in visible %s alerts', async severity => {
    const store = useAlertStore()
    const wrapper = mount(PageAlertRegion)
    for (const diagnostic of ['Unauthorized', 'Timeout', 'Disconnected', '«Failed to fetch»']) {
      store[severity](`Ошибка: ${diagnostic}`)
      await wrapper.vm.$nextTick()
      expect(wrapper.get(`[role="${severity === 'error' ? 'alert' : 'status'}"]`).text()).toContain(getErrorMessage(diagnostic))
      expect(wrapper.text()).not.toContain(diagnostic)
    }
    wrapper.unmount()
  })

  it.each(['Склад', 'ACME Logistics'])('preserves printer parameter %s in visible translated errors', async name => {
    const store = useAlertStore()
    const wrapper = mount(PageAlertRegion)
    store.error(new Error(`Printer not found: ${name}`))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain(`Принтер не найден: ${name}`)
    store.error(new Error(`Failed to connect to printer ${name}`))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain(`Не удалось подключиться к принтеру ${name}`)
    wrapper.unmount()
  })

  it('localizes field and general errors without duplicating the field summary', async () => {
    const error = { data: { msg: 'Validation failed', errors: { Name: ['The Name field is required.'], Count: 'Invalid input', Empty: '' } } }
    const fields = getServerFieldErrors(error)
    expect(fields).toEqual({ name: 'Обязательное поле', count: 'Некорректное значение' })
    const field = mount(FieldError, { props: { name: 'name', errors: fields } })
    expect(field.get('[role="alert"]').text()).toBe('Обязательное поле')
    await field.setProps({ errors: { name: 'Unknown validation failure' } })
    expect(field.get('[role="alert"]').text()).toBe('Некорректное значение')
    const store = useAlertStore()
    reportFormError(error, { alertStore: store, setErrors: () => {} })
    expect(store.alert).toBeNull()
    error.data.errors[''] = [connectionError]
    reportFormError(error, { alertStore: store, setErrors: () => {} })
    expect(store.alert.message).toBe(connectionMessage)
    field.unmount()
  })

  it('localizes blocking import failures and preserves column identifiers', () => {
    const wrapper = mount(ErrorDialog, {
      props: { show: true, title: 'Import failed', message: 'Invalid archive', missingColumns: ['ShipmentWeightKg'] },
      global: { stubs: { VDialog: { template: '<div><slot /></div>' }, VBtn: { template: '<button><slot /></button>' }, VCard: { template: '<div><slot /></div>' }, VCardTitle: { template: '<div><slot /></div>' }, VCardText: { template: '<div><slot /></div>' }, VCardActions: { template: '<div><slot /></div>' } } }
    })
    expect(wrapper.text()).toContain(DEFAULT_ERROR_MESSAGE)
    expect(wrapper.text()).toContain('ShipmentWeightKg')
    expect(wrapper.text()).not.toContain('Import failed')
    expect(wrapper.text()).not.toContain('Invalid archive')
    wrapper.unmount()
  })

  it.each([
    [yup.string().required(), '', 'Обязательное поле'],
    [yup.number(), 'abc', 'Неверный тип значения'],
    [yup.string().email(), 'abc', 'Введите корректный адрес электронной почты'],
    [yup.string().min(5), 'a', 'Минимальная длина: 5'],
    [yup.number().integer(), 1.5, 'Введите целое число']
  ])('uses Russian default schema validation', async (schema, value, message) => {
    await expect(schema.validate(value)).rejects.toThrow(message)
  })
})
