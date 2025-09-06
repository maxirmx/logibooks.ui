// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/**
 * Maps raw FEACN code DTOs into tree node objects used by the tree component
 * @param {Array} codes - Array of FeacnCodeDto
 * @returns {Array} Array of tree node objects
 */
export function mapFeacnCodesToNodes(codes = []) {
  return codes.map(c => ({
    ...c,
    children: [],
    expanded: false,
    loaded: false,
    loading: false
  }))
}

