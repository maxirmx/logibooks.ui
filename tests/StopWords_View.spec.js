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
import StopWords_View from '@/views/StopWords_View.vue'
import StopWords_List from '@/lists/StopWords_List.vue'

const vuetify = createVuetify()

// Mock the StopWords_List component
vi.mock('@/lists/StopWords_List.vue', () => ({
  default: {
    name: 'StopWords_List',
    template: '<div data-test="stopwords-list">StopWords_List Component</div>'
  }
}))

describe('StopWords_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(StopWords_View, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render StopWords_List component', () => {
    const stopWordsList = wrapper.findComponent(StopWords_List)
    expect(stopWordsList.exists()).toBe(true)
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="stopwords-list"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component', () => {
    expect(wrapper.html()).toContain('StopWords_List Component')
  })
})
