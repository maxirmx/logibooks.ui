// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

const authStoreMock = vi.hoisted(() => ({
  value: null
}))

const navigateToEditParcelMock = vi.hoisted(() => vi.fn())

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStoreMock.value
}))

vi.mock('@/helpers/parcels.list.helpers.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    navigateToEditParcel: navigateToEditParcelMock
  }
})

import { useParcelEditAccess } from '@/composables/useParcelEditAccess.js'

describe('useParcelEditAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStoreMock.value = {
      hasLogistRole: ref(true)
    }
  })

  it('allows authorized users to open parcel edit and runs the before-open callback', () => {
    const router = { push: vi.fn() }
    const item = { id: 10 }
    const onBeforeOpen = vi.fn()

    const access = useParcelEditAccess({
      router,
      getQueryParams: () => ({ registerId: 5, source: 'warehouse' }),
      onBeforeOpen
    })

    expect(access.canFollowParcelEditRoute.value).toBe(true)
    expect(access.isParcelEditCellDisabled.value).toBe(false)
    expect(access.parcelEditCellClass('truncated-cell')).toBe('truncated-cell clickable-cell')
    expect(access.openParcelEdit(item)).toBe(true)
    expect(onBeforeOpen).toHaveBeenCalledWith(item)
    expect(navigateToEditParcelMock).toHaveBeenCalledWith(
      router,
      item,
      'Редактирование посылки',
      { registerId: 5, source: 'warehouse' }
    )
  })

  it('silently blocks users without parcel edit route access', () => {
    authStoreMock.value = {
      hasLogistRole: ref(false)
    }
    const access = useParcelEditAccess({
      router: { push: vi.fn() },
      getQueryParams: () => ({ registerId: 5 })
    })

    expect(access.canFollowParcelEditRoute.value).toBe(false)
    expect(access.isParcelEditCellDisabled.value).toBe(true)
    expect(access.parcelEditCellClass('truncated-cell')).toBe('truncated-cell')
    expect(access.openParcelEdit({ id: 10 })).toBe(false)
    expect(navigateToEditParcelMock).not.toHaveBeenCalled()
  })

  it('silently blocks navigation while disabled even for authorized users', () => {
    const disabled = ref(true)
    const access = useParcelEditAccess({
      router: { push: vi.fn() },
      disabled,
      getQueryParams: () => ({ registerId: 5 })
    })

    expect(access.canFollowParcelEditRoute.value).toBe(true)
    expect(access.isParcelEditCellDisabled.value).toBe(true)
    expect(access.parcelEditCellClass('truncated-cell')).toBe('truncated-cell clickable-cell')
    expect(access.openParcelEdit({ id: 10 })).toBe(false)
    expect(navigateToEditParcelMock).not.toHaveBeenCalled()
  })

  it('silently blocks navigation when parcel id is missing', () => {
    const access = useParcelEditAccess({
      router: { push: vi.fn() },
      getQueryParams: () => ({ registerId: 5 })
    })

    expect(access.openParcelEdit({})).toBe(false)
    expect(access.openParcelEdit(null)).toBe(false)
    expect(navigateToEditParcelMock).not.toHaveBeenCalled()
  })

  it('silently blocks navigation when register id is missing', () => {
    const access = useParcelEditAccess({
      router: { push: vi.fn() },
      getQueryParams: () => ({ source: 'warehouse' })
    })

    expect(access.openParcelEdit({ id: 10 })).toBe(false)
    expect(navigateToEditParcelMock).not.toHaveBeenCalled()
  })

  it('uses default options and blocks when default query params have no register id', () => {
    const access = useParcelEditAccess()

    expect(access.canFollowParcelEditRoute.value).toBe(true)
    expect(access.openParcelEdit({ id: 10 })).toBe(false)
    expect(navigateToEditParcelMock).not.toHaveBeenCalled()
  })

  it('treats null query params as empty and blocks without register id', () => {
    const access = useParcelEditAccess({
      router: { push: vi.fn() },
      getQueryParams: () => null
    })

    expect(access.openParcelEdit({ id: 10 })).toBe(false)
    expect(navigateToEditParcelMock).not.toHaveBeenCalled()
  })

  it('accepts ref-like route name and query params', () => {
    const router = { push: vi.fn() }
    const item = { id: 10 }
    const access = useParcelEditAccess({
      router,
      routeName: ref('custom-parcel-edit'),
      getQueryParams: ref({ registerId: 7 })
    })

    expect(access.openParcelEdit(item)).toBe(true)
    expect(navigateToEditParcelMock).toHaveBeenCalledWith(
      router,
      item,
      'custom-parcel-edit',
      { registerId: 7 }
    )
  })
})
