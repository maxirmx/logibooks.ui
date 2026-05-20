/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanjobMonitorView from '@/views/Scanjob_Monitor_View.vue'
import { scanjobMonitorArea } from '@/helpers/scanjob.monitor.helpers.js'

const scanjobMonitorStub = {
  name: 'Scanjob_Monitor',
  props: ['scanjobId', 'monitorScope'],
  template: '<div data-test="scanjob-monitor">Monitor {{ scanjobId }}</div>'
}

describe('Scanjob_Monitor_View.vue', () => {
  it('passes scanjob id to monitor component', () => {
    const wrapper = mount(ScanjobMonitorView, {
      props: { id: 42 },
      global: {
        stubs: {
          ScanjobMonitor: scanjobMonitorStub
        }
      }
    })

    const monitor = wrapper.find('[data-test="scanjob-monitor"]')
    expect(monitor.exists()).toBe(true)

    const monitorComponent = wrapper.findComponent({ name: 'Scanjob_Monitor' })
    expect(monitorComponent.exists()).toBe(true)
    expect(monitorComponent.props('scanjob-id') || monitorComponent.props('scanjobId')).toBe(42)
    expect(monitorComponent.props('monitor-scope') || monitorComponent.props('monitorScope')).toEqual({
      area: scanjobMonitorArea.Boxes,
      boxId: null,
      bucketIndex: null
    })
    expect(monitorComponent.props('register-id') || monitorComponent.props('registerId')).toBeUndefined()
  })

  it('passes explicit monitor scope to monitor component', () => {
    const scope = {
      area: scanjobMonitorArea.Box,
      boxId: 7,
      bucketIndex: null
    }

    const wrapper = mount(ScanjobMonitorView, {
      props: {
        id: 42,
        monitorScope: scope
      },
      global: {
        stubs: {
          ScanjobMonitor: scanjobMonitorStub
        }
      }
    })

    const monitorComponent = wrapper.findComponent({ name: 'Scanjob_Monitor' })
    expect(monitorComponent.props('monitor-scope') || monitorComponent.props('monitorScope')).toEqual(scope)
  })
})
