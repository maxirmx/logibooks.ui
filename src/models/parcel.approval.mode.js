// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const ParcelApprovalMode = Object.freeze({
  SimpleApprove: 'SimpleApprove',
  ApproveWithExcise: 'ApproveWithExcise',
  ApproveWithNotification: 'ApproveWithNotification'
})

export function normalizeApprovalMode(mode) {
  if (mode === true) return ParcelApprovalMode.ApproveWithExcise
  if (mode === false || mode === undefined || mode === null) return ParcelApprovalMode.SimpleApprove
  return Object.values(ParcelApprovalMode).includes(mode)
    ? mode
    : ParcelApprovalMode.SimpleApprove
}
