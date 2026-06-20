import type { DataSource } from './source/DataSource'
import { FootballDataSource } from './source/FootballDataSource'

export const source: DataSource = new FootballDataSource({ live: false, cacheTtlMs: 300_000 })
export const sourceLabel = 'football-data.org + Flashscore · datos reales'

source.start()
