// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FeacnCodeSearchByKeyword from '@/components/FeacnCodeSearchByKeyword.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const keyWords = ref([])
const ensureLoaded = vi.fn(async () => {})

vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({
    keyWords,
    ensureLoaded
  })
}))

describe('FeacnCodeSearchByKeyword', () => {
  beforeEach(() => {
    keyWords.value = [
      { id: 1, word: 'Test keyword', feacnCodes: ['1111', '2222'] },
      { id: 2, word: 'Another', feacnCodes: ['3333'] }
    ]
    ensureLoaded.mockClear()
  })

  const createWrapper = (props = {}) =>
    mount(FeacnCodeSearchByKeyword, {
      props: { modelValue: true, ...props },
      global: {
        stubs: {
          ...vuetifyStubs
        }
      }
    })

  it('emits refocus event on unmount', () => {
    const wrapper = createWrapper()
    wrapper.unmount()
    expect(wrapper.emitted('refocus')).toBeTruthy()
  })
})
