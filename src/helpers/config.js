// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

// Create a config object that checks runtime first, then build-time, then fallback
export const config = {
  apiUrl: window.RUNTIME_CONFIG?.apiUrl ||
          import.meta.env.VITE_API_URL ||
          'http://localhost:8080/api',
  enableLog: window.RUNTIME_CONFIG?.enableLog === true ||
             import.meta.env.VITE_ENABLE_LOG === 'true' ||
             false
}

// Export individual config values for backward compatibility
export const apiUrl = config.apiUrl
export const enableLog = config.enableLog
