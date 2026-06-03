/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SenderRecipientCell from '@/components/SenderRecipientCell.vue'

describe('SenderRecipientCell.vue', () => {
  const companies = [
    { id: 10, shortName: 'Sender Short', name: 'Sender Full' },
    { id: 20, shortName: '', name: 'Recipient Full' }
  ]

  it('renders sender and recipient display names', () => {
    const wrapper = mount(SenderRecipientCell, {
      props: {
        item: { senderId: 10, recipientId: 20 },
        companies
      }
    })

    expect(wrapper.text()).toContain('Sender Short')
    expect(wrapper.text()).toContain('Recipient Full')
  })

  it('renders unknown label when company IDs are not found', () => {
    const wrapper = mount(SenderRecipientCell, {
      props: {
        item: { senderId: 30, recipientId: 40 },
        companies
      }
    })

    const rows = wrapper.findAll('.data-box > div')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toBe('Неизвестно')
    expect(rows[1].text()).toBe('Неизвестно')
  })
})
