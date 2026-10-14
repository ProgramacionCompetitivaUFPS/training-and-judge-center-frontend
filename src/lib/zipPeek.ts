// JSZip.loadAsync reads the whole file into memory (Blob.arrayBuffer()) to list entries —
// there's no cheaper way to peek at a zip's structure client-side. Past this size the memory
// spike isn't worth it just to check a couple of paths; skip silently and let the backend
// (which allows up to 200 MB for test-case data) be the sole validator for those files.
export const MAX_ZIP_STRUCTURE_CHECK_BYTES = 25 * 1024 * 1024

export function exceedsZipStructureCheckSize(file: File): boolean {
  return file.size > MAX_ZIP_STRUCTURE_CHECK_BYTES
}

// Returns the list of entry paths in the zip, or null if the file couldn't be read as one.
// Loaded lazily (code-split) since most users never trigger this path.
export async function peekZipEntryPaths(file: File): Promise<string[] | null> {
  try {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(file)
    return Object.keys(zip.files)
  } catch {
    return null
  }
}
