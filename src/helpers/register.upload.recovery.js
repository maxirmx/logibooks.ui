// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

const drafts = new Map()

export function rememberRegisterUploadDraft(id, payload) {
  const draft = { ...payload }
  delete draft.restrictionChangeConfirmationToken
  if (draft.realWeightKg === 0) draft.realWeightKg = null
  for (const field of ['invoiceDate', 'warehouseArrivalDate', 'decDate', 'releaseDate']) {
    const value = draft[field]
    if (value instanceof Date) {
      draft[field] = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    }
  }
  drafts.set(Number(id), draft)
}

export function getRegisterUploadDraft(id) {
  const draft = drafts.get(Number(id))
  return draft ? { ...draft } : null
}

export function clearRegisterUploadDraft(id) {
  drafts.delete(Number(id))
}
