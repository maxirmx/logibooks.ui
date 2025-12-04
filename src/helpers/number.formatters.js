// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

function parseNumberFlexible(value) {
  if (value == null) return NaN
  if (typeof value === 'number') return value
  let s = String(value).trim()
  if (s === '') return NaN

  // Remove spaces and non-breaking spaces commonly used as thousand separators
  s = s.replace(/\u00A0|\s/g, '')

  // If the string contains both comma and dot, assume dot is decimal and remove commas
  if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
    s = s.replace(/,/g, '')
  } else if (s.indexOf(',') !== -1) {
    // If only comma present, treat it as decimal separator
    s = s.replace(/,/g, '.')
  }

  // Strip any remaining non numeric except leading minus and dot
  s = s.replace(/[^0-9.-]/g, '')

  const num = Number(s)
  return Number.isFinite(num) ? num : NaN
}

export function formatWeight(value) {
  const num = parseNumberFlexible(value)
  if (!isFinite(num)) return '0.000'
  return formatWithSpaceThousands(num, 3)
}

export function formatPrice(value) {
  const num = parseNumberFlexible(value)
  if (!isFinite(num)) return '0.00'
  return formatWithSpaceThousands(num, 2)
}

function formatWithSpaceThousands(num, decimals) {
  const fixed = Math.abs(num).toFixed(decimals)
  const [intPart, fracPart] = fixed.split('.')
  // insert non-breaking space as thousands separator
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
  const sign = num < 0 ? '-' : ''
  return fracPart ? `${sign}${withSep}.${fracPart}` : `${sign}${withSep}`
}
