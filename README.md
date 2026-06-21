# Mundial 2026 ⚽

Polla del Mundial 2026 (48 selecciones, formato real): cada participante carga
sus **pronósticos** partido por partido, y el **resultado oficial** se carga a
mano y se comparte entre todos en vivo. Fase de grupos con tabla de posiciones
calculada en vivo y cuadro eliminatorio que resuelve los cruces desde la tabla.

No hay login: cada uno elige su nombre la primera vez y queda guardado en su
navegador. Los datos se comparten entre dispositivos vía Supabase.

## Correr

```bash
pnpm install
pnpm dev
```

Abrí http://localhost:5173 (Vite puede usar otro puerto si está ocupado).

Necesitás un `.env` con las credenciales de Supabase (ver abajo).

## Variables de entorno

Copiá `.env.example` a `.env` y completá:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Datos (Supabase)

Dos tablas, con RLS abierta (sin login) y realtime activado:

- **`matches`** — el resultado **oficial** de cada partido (uno solo, compartido).
  Pre-cargado para los partidos jugados, editable/corregible por cualquiera.
- **`predictions`** — el pronóstico de cada participante (`participant` +
  `match_id`, único por persona y partido). Lo que carga uno no pisa lo del otro.

Los equipos de eliminatorias no se cargan a mano: se resuelven desde la tabla de
grupos (`knockout.ts`). La fase de grupos y los partidos ya jugados salen de la
data real del torneo.

### Sembrar el calendario

```bash
pnpm seed:supabase
```

Inserta los 104 partidos (72 de grupos + 32 de eliminatorias) como calendario
base. Lee las credenciales del `.env`.

## La decisión de arquitectura

```
                            ┌─ SupabaseDataSource       (resultados oficiales)
UI ──► DataSource (puerto) ─┘

UI ──► PredictionSource (puerto) ──► SupabasePredictionSource (pronósticos)
```

La UI depende de **puertos** (`DataSource`, `PredictionSource`), nunca de una
implementación concreta. El único lugar que elige la implementación es
`store.ts` / `predictionStore.ts`. Eso es **inversión de dependencias** (la "D"
de SOLID): la fuente de datos es un detalle intercambiable.

La lógica de negocio (tablas, escenarios de clasificación, resolución del cuadro)
es **pura** y vive en `standings.ts` y `knockout.ts`, sin depender de la red.

## Tests

```bash
pnpm test            # suite completa (Vitest)
pnpm test:coverage   # con cobertura
```

La lógica pura está cubierta con Vitest: `standings.ts`, `knockout.ts`,
`teamMatch.ts` y el mapeo de pronósticos.

## Estructura

```
src/
  data/
    types.ts                  # modelo del dominio
    worldcup2026.ts           # 48 equipos y 12 grupos (data real)
    standings.ts              # tablas y escenarios de clasificación (PURO)
    knockout.ts               # resolución del cuadro (PURO)
    thirdsTable.ts            # mejores terceros
    teamMatch.ts              # matching de nombres de selección
    flags.ts                  # banderas (flagcdn) y nombres en español
    store.ts                  # compone el DataSource (Supabase)
    predictionStore.ts        # compone el PredictionSource (Supabase)
    source/
      DataSource.ts             # PUERTO: leer + guardar resultado + realtime
      SupabaseDataSource.ts     # adaptador de resultados oficiales (tabla matches)
      PredictionSource.ts       # PUERTO de pronósticos
      SupabasePredictionSource.ts # adaptador de pronósticos (tabla predictions)
      supabaseClient.ts         # cliente Supabase desde el .env
  hooks/                      # useTournament, useParticipant, usePredictions, useSaveResult
  components/                 # GroupStage, Bracket, MatchCard, ParticipantPicker, shared
  i18n/locale.tsx             # zona horaria (Perú / España) y formato de fecha
scripts/seed-supabase.mjs     # siembra el calendario en Supabase
```

## Funcionalidad

- **Resultado oficial:** los partidos programados se editan; los jugados quedan
  bloqueados con un botón **Corregir** para arreglar un marcador mal cargado.
- **Mi pronóstico:** cada participante carga el suyo; se guarda solo para él.
- **Pronósticos de los demás:** se ven al lado, en solo lectura.
- **Realtime:** lo que guarda otra persona aparece sin recargar.
- **Horario:** se muestra en hora de Perú o España (selector en el encabezado).
