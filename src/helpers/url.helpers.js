// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

export function ensureHttps(url) {
  if (!url) return url;
  return /^(https?:)?\/\//i.test(url) ? url : `https://${url}`;
}
