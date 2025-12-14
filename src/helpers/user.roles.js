// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

// Shared role and role-key constants for user-related modules
export const roleWhOperator = 'wh-operator'
export const roleLogist = 'logist'
export const roleSrLogist = 'sr-logist'
export const roleShiftLead = 'shift-lead'
export const roleAdmin = 'administrator'

export const keyWhOperator = 'WWH_OPERATOR'
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
  roleWhOperator
]

export const userRoleKeys = {
  roleAdmin: keyAdmin,
  roleShiftLead: keyShiftLead,
  roleSrLogist: keySrLogist,
  roleLogist: keyLogist,
  roleWhOperator: keyWhOperator,
  roleNone: keyNone
}
