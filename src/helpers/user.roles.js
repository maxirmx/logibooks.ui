// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

// Shared role and role-key constants for user-related modules
export const roleWhManager = 'wh-manager'
export const roleWhOperator = 'wh-operator'
export const roleLogist = 'logist'
export const roleSrLogist = 'sr-logist'
export const roleShiftLead = 'shift-lead'
export const roleAdmin = 'administrator'

export const keyWhManager = 'WH_MANAGER'
export const keyWhOperator = 'WH_OPERATOR'
export const keyLogist = 'LOGIST'
export const keySrLogist = 'SR_LOGIST'
export const keyShiftLead = 'SHIFT_LEAD'
export const keyAdmin = 'ADMIN'
export const keyNone = 'NONE'

export const userRoles = [
  roleAdmin,
  roleShiftLead,
  roleSrLogist,
  roleLogist,
  roleWhOperator,
  roleWhManager
]

export const userRoleKeys = {
  roleAdmin: keyAdmin,
  roleShiftLead: keyShiftLead,
  roleSrLogist: keySrLogist,
  roleLogist: keyLogist,
  roleWhOperator: keyWhOperator,
  roleWhManager: keyWhManager,
  roleNone: keyNone
}

const roleLabels = [
  { role: roleAdmin, label: 'Администратор' },
  { role: roleShiftLead, label: 'Старший смены' },
  { role: roleSrLogist, label: 'Старший логист' },
  { role: roleLogist, label: 'Логист' },
  { role: roleWhManager, label: 'Менеджер склада' },
  { role: roleWhOperator, label: 'Оператор склада' }
]

const roleFields = [
  { fieldName: 'isAdmin', key: keyAdmin, role: roleAdmin },
  { fieldName: 'isShiftLead', key: keyShiftLead, role: roleShiftLead },
  { fieldName: 'isSrLogist', key: keySrLogist, role: roleSrLogist },
  { fieldName: 'isLogist', key: keyLogist, role: roleLogist },
  { fieldName: 'isWhManager', key: keyWhManager, role: roleWhManager },
  { fieldName: 'isWhOperator', key: keyWhOperator, role: roleWhOperator }
]

const warehouseOnlyRoles = [roleWhManager, roleWhOperator]

export function hasRoleFields(user) {
  return roleFields.some(({ fieldName }) => Object.prototype.hasOwnProperty.call(user ?? {}, fieldName))
}

export function hasRoleSelection(user, fieldName, key, role) {
  if (hasRoleFields(user)) {
    return user?.[fieldName] === key || user?.[fieldName] === true
  }

  return user?.[fieldName] === key
    || user?.[fieldName] === true
    || user?.roles?.includes(role)
}

export function getCredentials(user) {
  return roleLabels
    .filter(({ role }) => user?.roles?.includes(role))
    .map(({ label }) => label)
    .join(', ')
}

export function hasOnlyWarehouseRoles(user) {
  const hasWarehouseRole = hasRoleSelection(user, 'isWhManager', keyWhManager, roleWhManager)
    || hasRoleSelection(user, 'isWhOperator', keyWhOperator, roleWhOperator)

  if (!hasWarehouseRole) {
    return false
  }

  return !(
    hasRoleSelection(user, 'isAdmin', keyAdmin, roleAdmin)
    || hasRoleSelection(user, 'isShiftLead', keyShiftLead, roleShiftLead)
    || hasRoleSelection(user, 'isSrLogist', keySrLogist, roleSrLogist)
    || hasRoleSelection(user, 'isLogist', keyLogist, roleLogist)
  )
}

export function hasAllWarehouseAccess(user) {
  return (user?.roles ?? []).some((role) => !warehouseOnlyRoles.includes(role))
}
