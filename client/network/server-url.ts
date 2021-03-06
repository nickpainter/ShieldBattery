const baseUrl =
  IS_ELECTRON && process.env.SB_SERVER ? process.env.SB_SERVER : __WEBPACK_ENV.SB_SERVER

// Returns an absolute server URL for a path, if necessary (if running in Electron). If it's not
// necessary (in the browser), the path will be returned unmodified
export function makeServerUrl(path: string) {
  if (!IS_ELECTRON) {
    return path
  }

  const slashedPath = (path.length === 0 || path.startsWith('/') ? '' : '/') + path
  return baseUrl + slashedPath
}
