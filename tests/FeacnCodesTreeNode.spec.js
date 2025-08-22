import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FeacnCodesTreeNode from '@/components/FeacnCodesTreeNode.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const globalStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': true
}

describe('FeacnCodesTreeNode.vue', () => {
  function createWrapper(nodeProps = {}, componentProps = {}) {
    const defaultNode = {
      id: 1,
      code: '01',
      codeEx: '01',
      name: 'Test Node',
      expanded: false,
      loaded: false,
      loading: false,
      children: []
    }

    return mount(FeacnCodesTreeNode, {
      props: {
        node: { ...defaultNode, ...nodeProps },
        ...componentProps
      },
      global: { stubs: globalStubs }
    })
  }

  it('renders node with code and name separately', () => {
    const wrapper = createWrapper({
      codeEx: '0101',
      name: 'Test Category'
    })
    
    // Check that codeEx is displayed in the code area
    expect(wrapper.find('.node-code').text()).toBe('0101')
    // Check that name is displayed in the label area
    expect(wrapper.find('.node-label').text()).toBe('Test Category')
  })

  it('shows plus icon when node is collapsed', () => {
    const wrapper = createWrapper({ expanded: false })
    
    const icon = wrapper.find('font-awesome-icon-stub')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('icon')).toBe('fa-solid fa-plus')
  })

  it('shows minus icon when node is expanded', () => {
    const wrapper = createWrapper({ 
      expanded: true,
      loaded: true,
      children: [{ id: 2, name: 'Child' }]
    })
    
    const icon = wrapper.find('font-awesome-icon-stub')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('icon')).toBe('fa-solid fa-minus')
  })

  it('shows placeholder when node is loaded but has no children', () => {
    const wrapper = createWrapper({ 
      loaded: true,
      children: []
    })
    
    expect(wrapper.find('.toggle-placeholder').exists()).toBe(true)
    expect(wrapper.find('.toggle-icon').exists()).toBe(false)
  })

  it('emits toggle event when icon is clicked', async () => {
    const wrapper = createWrapper()
    
    await wrapper.find('.toggle-icon').trigger('click')
    
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')[0][0]).toEqual(wrapper.props('node'))
  })

  it('emits toggle event when label is clicked', async () => {
    const wrapper = createWrapper()
    
    await wrapper.find('.node-label').trigger('click')
    
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')[0][0]).toEqual(wrapper.props('node'))
  })

  it('renders children when expanded', () => {
    const wrapper = createWrapper({
      expanded: true,
      children: [
        { id: 2, codeEx: '0101', name: 'Child 1', expanded: false, loaded: false, children: [] },
        { id: 3, codeEx: '0102', name: 'Child 2', expanded: false, loaded: false, children: [] }
      ]
    })
    
    const childList = wrapper.find('ul')
    expect(childList.exists()).toBe(true)
    // Check that children are rendered (they will have their own code and name areas)
    expect(wrapper.text()).toContain('Child 1')
    expect(wrapper.text()).toContain('Child 2')
    expect(wrapper.text()).toContain('0101')
    expect(wrapper.text()).toContain('0102')
  })

  it('does not render children when collapsed', () => {
    const wrapper = createWrapper({
      expanded: false,
      children: [
        { id: 2, codeEx: '0101', name: 'Child 1', expanded: false, loaded: false, children: [] }
      ]
    })
    
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('shows loading spinner when node is loading', () => {
    const wrapper = createWrapper({ loading: true })
    
    const spinner = wrapper.find('font-awesome-icon-stub[icon="fa-solid fa-spinner"]')
    expect(spinner.exists()).toBe(true)
    expect(spinner.attributes('spin')).toBe('')
    
    // Should not show toggle icon when loading
    expect(wrapper.find('.toggle-icon').exists()).toBe(false)
  })

  it('applies loading class to label when loading', () => {
    const wrapper = createWrapper({ loading: true })
    
    const label = wrapper.find('.node-label')
    expect(label.classes()).toContain('loading')
  })

  it('does not emit toggle when node is loading', async () => {
    const wrapper = createWrapper({ loading: true })
    
    // Try to click the label (icon won't be there)
    await wrapper.find('.node-label').trigger('click')
    
    // Should not emit toggle event when loading
    expect(wrapper.emitted('toggle')).toBeFalsy()
  })

  it('emits select event for leaf node in select mode', async () => {
    const wrapper = createWrapper(
      { code: '0123456789', codeEx: '0123456789', name: 'Leaf Node' },
      { selectMode: true }
    )

    const label = wrapper.find('.node-label')
    expect(label.classes()).toContain('clickable')
    const code = wrapper.find('.node-code')
    expect(code.classes()).toContain('clickable')

    await label.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0][0]).toEqual(wrapper.props('node'))
  })
})
