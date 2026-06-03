/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterInvoiceCell from '@/components/RegisterInvoiceCell.vue'

describe('RegisterInvoiceCell.vue', () => {
  it('renders invoice document number and date', () => {
    const wrapper = mount(RegisterInvoiceCell, {
      props: {
        item: {
          transportationTypeCode: 0,
          invoiceNumber: 'INV-1',
          invoiceDate: '2026-06-03'
        },
        getTransportationDocument: vi.fn().mockReturnValue('AWB')
      }
    })

    expect(wrapper.text()).toContain('AWB INV-1')
    expect(wrapper.text()).toContain('от 03.06.2026')
  })

  it('omits date row when invoice date is not set', () => {
    const wrapper = mount(RegisterInvoiceCell, {
      props: {
        item: { transportationTypeCode: 1, invoiceNumber: 'INV-2' },
        getTransportationDocument: vi.fn().mockReturnValue('CMR')
      }
    })

    expect(wrapper.text()).toBe('CMR INV-2')
    expect(wrapper.find('.invoice-date').exists()).toBe(false)
  })
})
