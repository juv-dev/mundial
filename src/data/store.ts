import type { DataSource } from './source/DataSource'
import { SupabaseDataSource } from './source/SupabaseDataSource'

export const source: DataSource = new SupabaseDataSource()
export const sourceLabel = 'Supabase · datos manuales'
