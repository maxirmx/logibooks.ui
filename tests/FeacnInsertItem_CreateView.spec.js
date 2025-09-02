import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnInsertItem_CreateView from '@/views/FeacnInsertItem_CreateView.vue'
import FeacnInsertItem_Settings from '@/dialogs/FeacnInsertItem_Settings.vue'

const vuetify = createVuetify()

vi.mock('@/dialogs/FeacnInsertItem_Settings.vue', () => ({
  default: {
    name: 'FeacnInsertItem_Settings',
    template: '<div data-test="fi-settings">FeacnInsertItem_Settings Component</div>'
  }
}))

describe('FeacnInsertItem_CreateView.vue', () => {
  it('renders FeacnInsertItem_Settings component', () => {
    const wrapper = mount(FeacnInsertItem_CreateView, {
      global: { plugins: [vuetify] }
    })
    const comp = wrapper.findComponent(FeacnInsertItem_Settings)
    expect(comp.exists()).toBe(true)
    expect(wrapper.html()).toContain('FeacnInsertItem_Settings Component')
  })
})
