// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { hasOnlyWarehouseRoles, keyNone, keyShiftLead, keyWhManager, keyWhOperator, roleLogist, roleWhManager } from '@/helpers/user.roles.js'

describe('user role helpers', () => {
  it('detects users with only warehouse roles from translated role fields', () => {
    expect(
      hasOnlyWarehouseRoles({
        roles: [roleLogist],
        isLogist: keyNone,
        isWhManager: keyWhManager,
        isWhOperator: keyWhOperator
      })
    ).toBe(true)
    expect(
      hasOnlyWarehouseRoles({
        roles: [roleWhManager],
        isShiftLead: keyShiftLead,
        isWhManager: keyWhManager
      })
    ).toBe(false)
  })

})
