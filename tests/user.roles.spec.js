// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import {
  getCredentials,
  hasAllWarehouseAccess,
  hasOnlyWarehouseRoles,
  isAutomatedSystem,
  keyNone,
  keyShiftLead,
  keyWhManager,
  keyWhOperator,
  roleAdmin,
  roleAdapter1C,
  roleAdapterAlta,
  roleLogist,
  roleShiftLead,
  roleSrLogist,
  roleWhManager,
  roleWhOperator
} from '@/helpers/user.roles.js'

describe('user role helpers', () => {
  it('formats user credentials in display order', () => {
    expect(
      getCredentials({
        roles: [roleWhOperator, roleAdmin, roleShiftLead, roleSrLogist, roleLogist, roleWhManager]
      })
    ).toBe('Администратор, Старший смены, Старший логист, Логист, Менеджер склада, Оператор склада')
    expect(getCredentials({ roles: [] })).toBe('')
    expect(getCredentials(null)).toBe('')
  })

  it('detects users with only warehouse roles from roles array', () => {
    expect(hasOnlyWarehouseRoles({ roles: [roleWhManager] })).toBe(true)
    expect(hasOnlyWarehouseRoles({ roles: [roleWhManager, roleWhOperator] })).toBe(true)
    expect(hasOnlyWarehouseRoles({ roles: [roleWhManager, roleLogist] })).toBe(false)
    expect(hasOnlyWarehouseRoles({ roles: [] })).toBe(false)
  })

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

  it('detects unrestricted warehouse access for non-warehouse roles', () => {
    expect(hasAllWarehouseAccess({ roles: [roleAdmin] })).toBe(true)
    expect(hasAllWarehouseAccess({ roles: [roleWhManager, roleLogist] })).toBe(true)
    expect(hasAllWarehouseAccess({ roles: [roleWhManager, roleWhOperator] })).toBe(false)
    expect(hasAllWarehouseAccess({ roles: [] })).toBe(false)
  })

  it('formats and detects automated-system roles', () => {
    const automatedSystem = { roles: [roleAdapter1C, roleAdapterAlta] }
    expect(isAutomatedSystem(automatedSystem)).toBe(true)
    expect(isAutomatedSystem({ roles: [roleAdapterAlta] })).toBe(true)
    expect(isAutomatedSystem({ roles: [roleAdmin] })).toBe(false)
    expect(getCredentials(automatedSystem)).toBe('Адаптер 1С, Адаптер Альта')
  })
})
