// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import StopWord_EditView from '@/views/StopWord_EditView.vue'
import StopWord_Settings from '@/components/StopWord_Settings.vue'

const vuetify = createVuetify()

// Mock the route
const mockRoute = {
  params: {
    id: '123'
  }
}

// Mock useRoute
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}))

// Mock the StopWord_Settings component
vi.mock('@/components/StopWord_Settings.vue', () => ({
  default: {
    name: 'StopWord_Settings',
    props: ['id'],
    template: '<div data-test="stopword-settings">StopWord_Settings Component with ID: {{ id }}</div>'
  }
}))

describe('StopWord_EditView', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(StopWord_EditView, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render StopWord_Settings component', () => {
    const stopWordSettings = wrapper.findComponent(StopWord_Settings)
    expect(stopWordSettings.exists()).toBe(true)
  })

  it('should pass route id to StopWord_Settings component', () => {
    const stopWordSettings = wrapper.findComponent(StopWord_Settings)
    expect(stopWordSettings.props('id')).toBe('123')
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="stopword-settings"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component for edit mode', () => {
    expect(wrapper.html()).toContain('StopWord_Settings Component with ID: 123')
  })

  it('should get route parameter correctly', () => {
    expect(wrapper.vm.route.params.id).toBe('123')
  })
})
