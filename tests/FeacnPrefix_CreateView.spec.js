import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnPrefix_CreateView from '@/views/FeacnPrefix_CreateView.vue'
import FeacnPrefix_Settings from '@/dialogs/FeacnPrefix_Settings.vue'

const vuetify = createVuetify()

vi.mock('@/dialogs/FeacnPrefix_Settings.vue', () => ({
  default: {
    name: 'FeacnPrefix_Settings',
    template: '<div data-test="fp-settings">FeacnPrefix_Settings Component</div>'
  }
}))

describe('FeacnPrefix_CreateView.vue', () => {
  it('renders FeacnPrefix_Settings component', () => {
    const wrapper = mount(FeacnPrefix_CreateView, {
      global: { plugins: [vuetify] }
    })
    const comp = wrapper.findComponent(FeacnPrefix_Settings)
    expect(comp.exists()).toBe(true)
    expect(wrapper.html()).toContain('FeacnPrefix_Settings Component')
  })
})

