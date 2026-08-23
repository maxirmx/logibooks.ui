// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

const sourceRoot = join(process.cwd(), 'src')

function sourceFiles(directory = sourceRoot) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(?:js|vue)$/.test(entry)
        ? [path]
        : []
  })
}

function describeViolations(files, predicate) {
  return files
    .filter((file) => predicate(readFileSync(file, 'utf8')))
    .map((file) => relative(process.cwd(), file).replaceAll('\\', '/'))
}

describe('error reporting source policy', () => {
  const files = sourceFiles()

  it('does not contain undocumented empty catch blocks', () => {
    const violations = describeViolations(files, (source) =>
      /catch\s*(?:\([^)]*\))?\s*\{\s*\}/m.test(source)
    )

    expect(violations).toEqual([])
  })

  it('does not render the retired component-local alert value', () => {
    const violations = describeViolations(
      files.filter((file) => file.endsWith('.vue')),
      (source) =>
        /v-if\s*=\s*["']alert(?:\.|["'])/m.test(source) ||
        /\{\{\s*alert\.message\s*\}\}/m.test(source)
    )

    expect(violations).toEqual([])
  })

  it('places one PageAlertRegion directly after the header rule in migrated components', () => {
    const migratedFiles = files.filter(
      (file) => file.endsWith('.vue') && /_(?:List|EditDialog|Settings)\.vue$/.test(basename(file))
    )
    const violations = describeViolations(
      migratedFiles,
      (source) =>
        !source.includes("import PageAlertRegion from '@/components/PageAlertRegion.vue'") ||
        !/<hr\s+class=["']hr["']\s*\/>\s*<PageAlertRegion\s*\/>/m.test(source) ||
        (source.match(/<PageAlertRegion\s*\/>/g) ?? []).length !== 1
    )

    expect(migratedFiles).toHaveLength(57)
    expect(violations).toEqual([])
  })
})
