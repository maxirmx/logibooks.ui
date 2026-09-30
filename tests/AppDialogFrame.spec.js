/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppDialogFrame from '@/components/AppDialogFrame.vue'

const stubs = {
  'v-card': { template: '<section><slot /></section>' },
  'v-card-title': { template: '<header><slot /></header>' },
  'v-card-text': { template: '<main><slot /></main>' },
  'v-card-actions': { template: '<footer><slot /></footer>' }
}

describe('AppDialogFrame', () => {

  it('renders a consistent visual cue for blocking errors', () => {
    const wrapper = mount(AppDialogFrame, {
      props: { title: 'Ошибка загрузки', tone: 'error' },
      global: { stubs }
    })

    expect(wrapper.find('.app-dialog-frame--error').exists()).toBe(true)
    expect(wrapper.get('.app-dialog-frame__tone-icon').text()).toBe('!')
  })
})
