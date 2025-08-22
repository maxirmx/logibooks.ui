/* @vitest-environment jsdom */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import FeacnCodes_Tree from '@/components/FeacnCodes_Tree.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const uploadMock = vi.fn()
const getUploadProgressMock = vi.fn()
const cancelUploadMock = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    upload: uploadMock,
    getUploadProgress: getUploadProgressMock,
    cancelUpload: cancelUploadMock
  })
}))

const globalStubs = {
  ...vuetifyStubs,
  FeacnCodesTree: { template: '<div class="tree-stub"></div>' }
}

describe('FeacnCodes_Tree.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    cancelUploadMock.mockResolvedValue()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createWrapper() {
    return mount(FeacnCodes_Tree, {
      global: { stubs: globalStubs }
    })
  }

  it('uploads file and tracks progress', async () => {
    uploadMock.mockResolvedValue({ id: 'handle' })
    getUploadProgressMock
      .mockResolvedValueOnce({ total: 10, processed: 0, finished: false })
      .mockResolvedValueOnce({ total: 10, processed: 10, finished: true })

    const wrapper = createWrapper()
    const file = new File(['content'], 'codes.xlsx')
    await wrapper.vm.fileSelected(file)

    expect(uploadMock).toHaveBeenCalledWith(file)
    expect(wrapper.vm.uploadState.show).toBe(true)

    await vi.runOnlyPendingTimersAsync()
    await flushPromises()

    expect(getUploadProgressMock).toHaveBeenCalledWith('handle')
    expect(wrapper.vm.uploadState.show).toBe(false)
  })

  it('cancels upload', async () => {
    uploadMock.mockResolvedValue({ id: 'handle' })
    getUploadProgressMock.mockResolvedValue({ total: 10, processed: 0, finished: false })

    const wrapper = createWrapper()
    const file = new File(['content'], 'codes.xlsx')
    await wrapper.vm.fileSelected(file)
    await flushPromises()

    expect(wrapper.vm.uploadState.show).toBe(true)

    await wrapper.vm.cancelUploadWrapper()
    expect(cancelUploadMock).toHaveBeenCalledWith('handle')
    expect(wrapper.vm.uploadState.show).toBe(false)
  })
})

