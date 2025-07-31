export function ensureHttps(url) {
  if (!url) return url;
  return /^(https?:)?\/\//i.test(url) ? url : `https://${url}`;
}
