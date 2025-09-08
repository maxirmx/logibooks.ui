/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import FeacnCodes_Tree from '@/components/FeacnCodes_Tree.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const uploadMock = vi.fn()
const alertSuccessMock = vi.fn()
const alertErrorMock = vi.fn()

// Mock Pinia's storeToRefs to return the mock values
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) => {
      if (store.isAdminOrSrLogist) {
        return { 
          isAdminOrSrLogist: store.isAdminOrSrLogist
        }
      }
      if (store.alert) {
        return { alert: store.alert }
      }
      return {}
    })
  }
})

const mockAuthStore = {
  isAdminOrSrLogist: ref(true)
}

const mockAlertStore = {
  alert: ref(null),
  success: alertSuccessMock,
  error: alertErrorMock
}

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    upload: uploadMock
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => mockAlertStore
}))

const globalStubs = {
  ...vuetifyStubs,
  FeacnCodesTree: { 
    template: '<div class="tree-stub"></div>',
    setup() {
      return {
        loadChildren: vi.fn()
      }
    }
  }
}

describe('FeacnCodes_Tree.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createWrapper() {
    return mount(FeacnCodes_Tree, {
      global: { stubs: globalStubs }
    })
  }

  it('renders tree component and upload link', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.tree-stub').exists()).toBe(true)
    expect(wrapper.find('a.link').exists()).toBe(true)
    expect(wrapper.text()).toContain('Загрузить коды ТН ВЭД')
  })

  it('uploads file successfully', async () => {
    uploadMock.mockResolvedValue()
    
    const wrapper = createWrapper()
    const file = new File(['content'], 'codes.xlsx')
    
    await wrapper.vm.fileSelected(file)
    await flushPromises()

    expect(uploadMock).toHaveBeenCalledWith(file)
    expect(wrapper.vm.uploading).toBe(false)
  })

  it('handles upload error', async () => {
    const error = new Error('Upload failed')
    uploadMock.mockRejectedValue(error)
    
    const wrapper = createWrapper()
    const file = new File(['content'], 'codes.xlsx')
    
    await wrapper.vm.fileSelected(file)
    await flushPromises()

    expect(uploadMock).toHaveBeenCalledWith(file)
    expect(alertErrorMock).toHaveBeenCalledWith('Ошибка при загрузке файла: Upload failed')
    expect(wrapper.vm.uploading).toBe(false)
  })

  it('shows loading state during upload', async () => {
    let resolveUpload
    uploadMock.mockImplementation(() => new Promise(resolve => { resolveUpload = resolve }))
    
    const wrapper = createWrapper()
    const file = new File(['content'], 'codes.xlsx')
    
    // Start upload
    const uploadPromise = wrapper.vm.fileSelected(file)
    await wrapper.vm.$nextTick()

    // Should be in loading state
    expect(wrapper.vm.uploading).toBe(true)
    expect(wrapper.find('a.link').classes()).toContain('disabled')
    expect(wrapper.text()).toContain('Загрузка...')

    // Complete upload
    resolveUpload()
    await uploadPromise
    await flushPromises()

    // Should be back to normal state
    expect(wrapper.vm.uploading).toBe(false)
    expect(wrapper.find('a.link').classes()).not.toContain('disabled')
    expect(wrapper.text()).toContain('Загрузить коды ТН ВЭД')
  })

  it('opens file dialog when link is clicked', async () => {
    const wrapper = createWrapper()
    const fileInput = wrapper.find('input[type="file"]')
    
    // Mock the click method
    const clickSpy = vi.spyOn(fileInput.element, 'click')
    
    await wrapper.find('a.link').trigger('click')
    
    expect(clickSpy).toHaveBeenCalled()
  })

  it('does not handle file selection when no file provided', async () => {
    const wrapper = createWrapper()
    
    await wrapper.vm.fileSelected(null)
    
    expect(uploadMock).not.toHaveBeenCalled()
    expect(alertSuccessMock).not.toHaveBeenCalled()
    expect(alertErrorMock).not.toHaveBeenCalled()
  })

  it('handles upload successfully when tree ref is null', async () => {
    uploadMock.mockResolvedValue()
    
    const wrapper = createWrapper()
    const file = new File(['content'], 'codes.xlsx')
    
    // Set tree ref to null to test the null check
    wrapper.vm.treeRef = null
    
    await wrapper.vm.fileSelected(file)
    await flushPromises()

    expect(uploadMock).toHaveBeenCalledWith(file)
    expect(wrapper.vm.uploading).toBe(false)
  })
})

