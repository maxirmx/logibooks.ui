// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export function hexToRgb(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value ?? '')) return null
  return [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16)).join(', ')
}

export function rgbToHex(value) {
  const match = value?.match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/)
  if (!match) return null

  const channels = match.slice(1).map(Number)
  if (channels.some((channel) => channel > 255)) return null

  return '#' + channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')
}

export function isOptionalRgb(value) {
  return !value?.trim() || rgbToHex(value) !== null
}
