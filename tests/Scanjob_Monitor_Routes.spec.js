// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import router from '@/router'
import { scanjobMonitorArea } from '@/helpers/scanjob.monitor.helpers.js'

function getRouteProps(path) {
  const resolved = router.resolve(path)
  const record = resolved.matched.at(-1)
  return record.props.default(resolved)
}

describe('scanjob monitor routes', () => {
  it('maps base monitor route to register scope', () => {
    expect(getRouteProps('/scanjobs/42/monitor')).toEqual({
      id: 42,
      monitorScope: {
        area: scanjobMonitorArea.Boxes,
        boxId: null,
        bucketIndex: null
      }
    })
  })

  it('maps box monitor route to box scope', () => {
    expect(getRouteProps('/scanjobs/42/monitor/boxes/7')).toEqual({
      id: 42,
      monitorScope: {
        area: scanjobMonitorArea.Box,
        boxId: 7,
        bucketIndex: null
      }
    })
  })

  it('maps unassigned monitor route to unassigned scope', () => {
    expect(getRouteProps('/scanjobs/42/monitor/unassigned/1')).toEqual({
      id: 42,
      monitorScope: {
        area: scanjobMonitorArea.Unassigned,
        boxId: null,
        bucketIndex: 1
      }
    })
  })
})
