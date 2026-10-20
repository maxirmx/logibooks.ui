// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import Content from '@/components/ScanjobFinishConfirmationContent.vue'

enableAutoUnmount(afterEach)

function render(options = { canMarkUnscannedAsNotFound: true, targetRegisterStatus: { id: 2, title: 'На складе' } }) {
  const choices = reactive({
    markUnscannedAsNotFound: options.canMarkUnscannedAsNotFound,
    updateRegisterStatus: options.targetRegisterStatus !== null
  })
  return mount(Content, { props: { options, choices,
    onChange: (field, value) => { choices[field] = value }
  } })
}

describe('completion radio groups', () => {
  it('renders the configured status and independently operates both real radio groups', async () => {
    const wrapper = render()
    const mark = wrapper.findAll('input[name="finishUnscannedParcels"]')
    const update = wrapper.findAll('input[name="finishRegisterStatus"]')
    expect(wrapper.text()).toContain('Изменить на «На складе»')
    expect(wrapper.element.firstElementChild.textContent).toContain('Неотсканированные посылки:')
    expect(wrapper.text()).not.toContain('Задание будет завершено при любом выборе.')
    expect(wrapper.findAll('[role="group"]')).toHaveLength(2)
    expect(mark[0].element.checked).toBe(true)
    expect(update[0].element.checked).toBe(true)
    await mark[1].setValue()
    expect(mark[1].element.checked).toBe(true)
    expect(update[0].element.checked).toBe(true)
    await update[1].setValue()
    expect(mark[1].element.checked).toBe(true)
    expect(update[1].element.checked).toBe(true)
    await mark[0].setValue()
    await update[0].setValue()
    expect(wrapper.emitted('change')).toEqual([
      ['markUnscannedAsNotFound', false], ['updateRegisterStatus', false],
      ['markUnscannedAsNotFound', true], ['updateRegisterStatus', true]
    ])
  })

  it.each([[true, true], [true, false], [false, true], [false, false]])('only renders available groups %s / %s', (mark, update) => {
    const wrapper = render({
      canMarkUnscannedAsNotFound: mark,
      targetRegisterStatus: update ? { id: 2, title: 'На складе' } : null
    })
    expect(wrapper.find('[aria-labelledby="finish-parcels-label"]').exists()).toBe(mark)
    expect(wrapper.find('[aria-labelledby="finish-register-label"]').exists()).toBe(update)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength((Number(mark) + Number(update)) * 2)
    expect(wrapper.find('input:disabled').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('не настроен')
    expect(wrapper.text()).not.toContain('не применяется')
  })
})
