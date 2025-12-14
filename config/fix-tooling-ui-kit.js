// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

// Fix for @sw-consulting/tooling.ui.kit package file naming issues
// The package.json references files with different names than what exists in dist/

import { existsSync, symlinkSync, unlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const distPath = join(__dirname, '..', 'node_modules', '@sw-consulting', 'tooling.ui.kit', 'dist')

const symlinks = [
  { source: 'tooling-ui-kit.js', target: 'tooling-ui-kit.es.js' },
  { source: 'tooling-ui-kit.umd.cjs', target: 'tooling-ui-kit.umd.js' },
  { source: 'tooling-ui-kit.css', target: 'tooling.ui.kit.css' }
]

// Check if the package is installed
if (!existsSync(distPath)) {
  console.log('Skipping tooling.ui.kit fix: package not found')
   
  process.exit(0)
}

symlinks.forEach(({ source, target }) => {
  const sourcePath = join(distPath, source)
  const targetPath = join(distPath, target)
  
  // Remove existing symlink/file if it exists
  if (existsSync(targetPath)) {
    try {
      unlinkSync(targetPath)
    } catch {
      // Ignore errors when removing symlinks/files that may not exist
    }
  }
  
  // Create symlink
  if (existsSync(sourcePath)) {
    try {
      symlinkSync(source, targetPath)
      console.log(`Created symlink: ${target} -> ${source}`)
    } catch (err) {
      console.warn(`Warning: Could not create symlink ${target}:`, err.message)
    }
  }
})

console.log('Tooling UI Kit package files fixed successfully')
