// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const OP_MODE_PAPERWORK = 'modePaperwork'
export const OP_MODE_WAREHOUSE = 'modeWarehouse'

export function getRegisterNouns(mode = OP_MODE_PAPERWORK) {
  if (mode === OP_MODE_WAREHOUSE) {
    return {
      singular: 'Партия',
      plural: 'Партии',
      genitivePlural: 'партий',
      genitivePluralCapitalized: 'Партий',
      accusative: 'партию',
      prepositional: 'партии',
      genitiveSingular: 'партии'
    }
  }

  return {
    singular: 'Реестр',
    plural: 'Реестры',
    genitivePlural: 'реестров',
    genitivePluralCapitalized: 'Реестров',
    accusative: 'реестр',
    prepositional: 'реестре',
    genitiveSingular: 'реестра'
  }
}
