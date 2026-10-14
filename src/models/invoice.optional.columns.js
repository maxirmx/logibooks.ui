// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

// Invoice optional columns flags enumeration for JavaScript
// Mirrors backend C# enum InvoiceOptionalColumns
// [Flags]
// public enum InvoiceOptionalColumns
// {
//     None = 0,
//     BagNumber = 1 << 0,
//     FullName = 1 << 1,
//     PreviousDteg = 1 << 2,
//     Uin = 1 << 3,
//     Url = 1 << 4
// }

export const InvoiceOptionalColumns = Object.freeze({
  None: 0,
  BagNumber: 1 << 0,
  FullName: 1 << 1,
  PreviousDteg: 1 << 2,
  Uin: 1 << 3,
  Url: 1 << 4
})

export default InvoiceOptionalColumns
