// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect } from 'vitest'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE, getRegisterNouns } from '@/helpers/op.mode.js'

describe('op.mode', () => {
  describe('constants', () => {
    it('exports OP_MODE_PAPERWORK constant', () => {
      expect(OP_MODE_PAPERWORK).toBe('modePaperwork')
    })

    it('exports OP_MODE_WAREHOUSE constant', () => {
      expect(OP_MODE_WAREHOUSE).toBe('modeWarehouse')
    })
  })

  describe('getRegisterNouns', () => {
    describe('paperwork mode', () => {
      it('returns paperwork nouns when mode is OP_MODE_PAPERWORK', () => {
        const nouns = getRegisterNouns(OP_MODE_PAPERWORK)
        
        expect(nouns).toEqual({
          singular: 'Реестр',
          plural: 'Реестры',
          genitivePlural: 'реестров',
          genitivePluralCapitalized: 'Реестров',
          accusative: 'реестр',
          prepositional: 'реестре',
          genitiveSingular: 'реестра'
        })
      })

      it('returns paperwork nouns when no mode is provided (default)', () => {
        const nouns = getRegisterNouns()
        
        expect(nouns).toEqual({
          singular: 'Реестр',
          plural: 'Реестры',
          genitivePlural: 'реестров',
          genitivePluralCapitalized: 'Реестров',
          accusative: 'реестр',
          prepositional: 'реестре',
          genitiveSingular: 'реестра'
        })
      })

      it('returns paperwork nouns for undefined mode', () => {
        const nouns = getRegisterNouns(undefined)
        
        expect(nouns).toEqual({
          singular: 'Реестр',
          plural: 'Реестры',
          genitivePlural: 'реестров',
          genitivePluralCapitalized: 'Реестров',
          accusative: 'реестр',
          prepositional: 'реестре',
          genitiveSingular: 'реестра'
        })
      })

      it('returns paperwork nouns for invalid mode', () => {
        const nouns = getRegisterNouns('invalidMode')
        
        expect(nouns).toEqual({
          singular: 'Реестр',
          plural: 'Реестры',
          genitivePlural: 'реестров',
          genitivePluralCapitalized: 'Реестров',
          accusative: 'реестр',
          prepositional: 'реестре',
          genitiveSingular: 'реестра'
        })
      })
    })

    describe('warehouse mode', () => {
      it('returns warehouse nouns when mode is OP_MODE_WAREHOUSE', () => {
        const nouns = getRegisterNouns(OP_MODE_WAREHOUSE)
        
        expect(nouns).toEqual({
          singular: 'Партия',
          plural: 'Партии',
          genitivePlural: 'партий',
          genitivePluralCapitalized: 'Партий',
          accusative: 'партию',
          prepositional: 'партии',
          genitiveSingular: 'партии'
        })
      })
    })

    describe('noun forms', () => {
      it('returns all required noun forms for paperwork mode', () => {
        const nouns = getRegisterNouns(OP_MODE_PAPERWORK)
        
        expect(nouns).toHaveProperty('singular')
        expect(nouns).toHaveProperty('plural')
        expect(nouns).toHaveProperty('genitivePlural')
        expect(nouns).toHaveProperty('genitivePluralCapitalized')
        expect(nouns).toHaveProperty('accusative')
        expect(nouns).toHaveProperty('prepositional')
        expect(nouns).toHaveProperty('genitiveSingular')
      })

      it('returns all required noun forms for warehouse mode', () => {
        const nouns = getRegisterNouns(OP_MODE_WAREHOUSE)
        
        expect(nouns).toHaveProperty('singular')
        expect(nouns).toHaveProperty('plural')
        expect(nouns).toHaveProperty('genitivePlural')
        expect(nouns).toHaveProperty('genitivePluralCapitalized')
        expect(nouns).toHaveProperty('accusative')
        expect(nouns).toHaveProperty('prepositional')
        expect(nouns).toHaveProperty('genitiveSingular')
      })
    })
  })
})
