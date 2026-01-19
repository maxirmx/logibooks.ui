// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

export const OZON_COMPANY_ID = 1
export const WBR_COMPANY_ID = 2

// All real company IDs must be <= THE_LAST_VISIBLE_COMPANY.
// Values greater than this boundary are reserved for synthetic entities
// such as register type identifiers.
export const THE_LAST_VISIBLE_COMPANY = 1024 * 1024;

/**
 * Synthetic register type identifier for "Wildberries format 2" registers.
 *
 * IMPORTANT:
 * - This is NOT a real companyId and must not be persisted or sent to the
 *   backend as a company identifier.
 * - When creating register records, the backend must map this synthetic
 *   register type to the real Wildberries company (WBR_COMPANY_ID = 2).
 *
 * Existing code may still refer to this as a companyId; new code should
 * prefer WBR2_REGISTER_TYPE_ID to make the intent explicit.
 */
export const WBR2_REGISTER_ID = THE_LAST_VISIBLE_COMPANY + WBR_COMPANY_ID;      // Wildberries format 2 [TJ, GE]

// Prefer this alias in new code to avoid confusing this synthetic ID with
// a real companyId.
export const WBR2_REGISTER_TYPE_ID = WBR2_REGISTER_ID;
