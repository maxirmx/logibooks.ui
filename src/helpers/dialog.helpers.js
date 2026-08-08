// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const APP_DIALOG_MAX_WIDTH = 'calc(100vw - 32px)'

export const APP_DIALOG_SIZES = Object.freeze({
  progress: 320,
  small: 440,
  medium: 560,
  search: 640,
  workflow: 960
})

export const APP_DIALOG_BUTTON_PROPS = Object.freeze({
  primary: Object.freeze({ color: 'primary', variant: 'flat' }),
  destructive: Object.freeze({ color: 'orange-darken-3', variant: 'flat' }),
  secondary: Object.freeze({ variant: 'text' })
})

export function getAppDialogWidth(size = 'medium') {
  return APP_DIALOG_SIZES[size] ?? APP_DIALOG_SIZES.medium
}
