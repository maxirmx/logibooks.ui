// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const legacyDialogException = path.normalize('l2/ParcelStatusBulkChangeDialog.vue')

function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? getSourceFiles(fullPath) : [fullPath]
  })
}

describe('dialog style conventions', () => {
  it('uses AppDialogFrame for every non-exempt custom v-dialog', () => {
    const offenders = getSourceFiles(sourceRoot)
      .filter((file) => file.endsWith('.vue'))
      .filter((file) => fs.readFileSync(file, 'utf8').includes('<v-dialog'))
      .filter((file) => path.relative(sourceRoot, file) !== legacyDialogException)
      .filter((file) => !fs.readFileSync(file, 'utf8').includes('<AppDialogFrame'))
      .map((file) => path.relative(sourceRoot, file))

    expect(offenders).toEqual([])
  })

  it('centralizes confirmations outside the explicit legacy exception', () => {
    const allowedFiles = new Set([
      path.normalize('composables/useAppConfirm.js'),
      legacyDialogException
    ])
    const offenders = getSourceFiles(sourceRoot)
      .filter((file) => /\.(?:js|vue)$/.test(file))
      .filter((file) =>
        /import\s*\{\s*useConfirm\s*\}\s*from\s*['"]vuetify-use-dialog['"]/.test(
          fs.readFileSync(file, 'utf8')
        )
      )
      .map((file) => path.relative(sourceRoot, file))
      .filter((file) => !allowedFiles.has(file))

    expect(offenders).toEqual([])
  })

  it('centralizes button colors and variants for shared-frame dialogs', () => {
    const offenders = getSourceFiles(sourceRoot)
      .filter((file) => file.endsWith('.vue'))
      .filter((file) => fs.readFileSync(file, 'utf8').includes('<AppDialogFrame'))
      .flatMap((file) => {
        const source = fs.readFileSync(file, 'utf8')
        const hardcodedButtons = source
          .match(/<v-btn\b[\s\S]*?>/g)
          ?.filter((tag) => /\b(?:color|variant)=/.test(tag))

        return hardcodedButtons?.length ? [path.relative(sourceRoot, file)] : []
      })

    expect(offenders).toEqual([])
  })
})
