import { describe, it, expect } from 'vitest'
import { sameTeam } from './teamMatch'

describe('sameTeam', () => {
  it('should return false when either name is missing', () => {
    expect(sameTeam(undefined, 'Brazil')).toBe(false)
    expect(sameTeam('Brazil', undefined)).toBe(false)
    expect(sameTeam('', 'Brazil')).toBe(false)
  })

  it('should match identical names ignoring case and spacing', () => {
    expect(sameTeam('Brazil', 'brazil')).toBe(true)
    expect(sameTeam('Saudi Arabia', 'saudiarabia')).toBe(true)
  })

  it('should match names that differ only by accents', () => {
    expect(sameTeam('Côte', 'Cote')).toBe(true)
  })

  it('should match known aliases', () => {
    expect(sameTeam('United States', 'USA')).toBe(true)
    expect(sameTeam('Czechia', 'Czech Republic')).toBe(true)
    expect(sameTeam('South Korea', 'Korea Republic')).toBe(true)
    expect(sameTeam('Iran', 'IR Iran')).toBe(true)
    expect(sameTeam('Congo DR', 'DR Congo')).toBe(true)
  })

  it('should match by shared four-character prefix', () => {
    expect(sameTeam('Netherlands', 'Netherland')).toBe(true)
  })

  it('should not match different teams', () => {
    expect(sameTeam('Argentina', 'Brazil')).toBe(false)
  })

  it('should not prefix-match names shorter than four characters', () => {
    expect(sameTeam('abc', 'abd')).toBe(false)
  })
})
