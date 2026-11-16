import { describe, it, expect } from 'vitest'
import { exceedsZipStructureCheckSize, exceedsUploadSizeLimit } from './zipPeek'

describe('exceedsZipStructureCheckSize', () => {
  it('retorna false para un archivo de exactamente 25 MB', () => {
    expect(exceedsZipStructureCheckSize({ size: 25 * 1024 * 1024 } as File)).toBe(false)
  })
  it('retorna true para un archivo que supera 25 MB', () => {
    expect(exceedsZipStructureCheckSize({ size: 25 * 1024 * 1024 + 1 } as File)).toBe(true)
  })
  it('retorna false para un archivo pequeño', () => {
    expect(exceedsZipStructureCheckSize({ size: 1024 } as File)).toBe(false)
  })
})

describe('exceedsUploadSizeLimit', () => {
  it('retorna false para un archivo de exactamente 150 MB', () => {
    expect(exceedsUploadSizeLimit({ size: 150 * 1024 * 1024 } as File)).toBe(false)
  })
  it('retorna true para un archivo que supera 150 MB', () => {
    expect(exceedsUploadSizeLimit({ size: 150 * 1024 * 1024 + 1 } as File)).toBe(true)
  })
  it('retorna false para un archivo pequeño', () => {
    expect(exceedsUploadSizeLimit({ size: 1024 } as File)).toBe(false)
  })
})
