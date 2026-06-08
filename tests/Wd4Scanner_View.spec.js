// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Wd4ScannerView from '@/views/Wd4Scanner_View.vue'

describe('Wd4Scanner_View', () => {
  it('renders WD4 setup guide sections and images', () => {
    const wrapper = mount(Wd4ScannerView)

    expect(wrapper.find('h1').text()).toBe('Настройки WD4')
    expect(wrapper.text()).toContain('Полный вариант')
    expect(wrapper.text()).toContain('Сокращённый вариант, только для новых устройств')
    expect(wrapper.text()).toContain('Bluetooth pairing')
    expect(wrapper.text()).toContain('@SETUPE1')
    expect(wrapper.text()).toContain('@INTERF10')
    expect(wrapper.text()).toContain('@TSUSET0D0A')
    expect(wrapper.text()).toContain('Наклейка на коробке, префикс BS20')
    expect(wrapper.findAll('img')).toHaveLength(15)
  })
})
