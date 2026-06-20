# Mundial 2026 ⚽

Web del Mundial 2026 (48 selecciones, formato real) con **simulación en vivo**:
fase de grupos que se actualiza sola, cuadro eliminatorio que resuelve ganadores
solo, y detalle de partido con **alineaciones, goles, estadísticas y resumen**.

## Correr

```bash
npm install
npm run dev
```

Abrí http://localhost:5173

## Datos reales — opcional y gratis (sin tarjeta)

Por defecto corre con el **simulador**. Hay dos fuentes reales soportadas; el
store elige sola según qué env var encuentre (prioridad: Highlightly → API-Football → mock).

### Opción recomendada: Highlightly (datos + VIDEOS de goles)

Una sola API gratis (plan Basic = 100 req/día, **sin tarjeta de crédito**) que da
en vivo + estadísticas + cambios + **videos de highlights**.

1. Registrate gratis en https://highlightly.net/ y copiá tu API key.
2. Creá un `.env` en la raíz:
   ```
   VITE_HIGHLIGHTLY_KEY=tu_key_aca
   ```
3. Reiniciá: `npm run dev`. Aparece la pestaña **Video** en el detalle del partido.

### Alternativa: API-Football (datos, sin video)

```
VITE_API_FOOTBALL_KEY=tu_key_aca
```
Registro gratis en https://dashboard.api-football.com/register (100 req/día, sin tarjeta).

> ⚠️ **Sobre los videos**: los resúmenes de goles se publican **después** del
> partido (0–48 h) porque los clips en vivo son derechos pagos de FIFA/TV. No se
> puede elegir narración (ESPN, etc.): la API agrega clips públicos y devuelve lo
> que haya. El adaptador ordena primero los que parezcan en español, pero no lo
> garantiza.
>
> ⚠️ **Cuota (100 req/día)**: el adaptador la cuida — 1 request inicial + poll de
> en-vivo cada 90s (solo si hay partidos vivos) + detalle/videos **solo al abrir
> un partido**, cacheado. Tope de seguridad (`maxRequests`, default 90) que corta
> el poll antes de quemar la cuota.
>
> ⚠️ **CORS**: si el navegador bloquea las llamadas directas a Highlightly,
> necesitás un mini-proxy (su doc lo recomienda para ocultar la key). Avisame y te
> lo armo.

## La decisión de arquitectura (importante)

```
                            ┌─ MockDataSource        (simulador en vivo)
UI ──► DataSource (puerto) ─┤
                            └─ ApiFootballDataSource  (datos reales)
```

La UI depende del **puerto** `DataSource`, nunca de una implementación concreta.
El único lugar que elige es `src/data/store.ts` — y lo hace solo según la env var.
Eso es **inversión de dependencias** (la "D" de SOLID): la fuente de datos es un
detalle intercambiable, no el centro del sistema.

## Estructura

```
src/
  data/
    types.ts              # modelo del dominio
    worldcup2026.ts       # 48 equipos, 12 grupos, sembrado de 16avos
    standings.ts          # cálculo PURO de tablas de grupo
    store.ts              # composición: elige el DataSource
    source/
      DataSource.ts       # PUERTO (interfaz)
      MockDataSource.ts   # motor de simulación en vivo
      ApiFootballDataSource.ts  # adaptador real (stub)
  hooks/useTournament.ts  # puente reactivo (useSyncExternalStore)
  components/             # UI (grupos, bracket, tarjeta, modal, ticker)
```

## Qué simula el motor

- Partidos que avanzan minuto a minuto (tick cada 2.5s)
- Goles, penales, tarjetas amarillas/rojas
- Estadísticas vivas (posesión, remates, córners, pases…)
- Entretiempo
- Penales en eliminatorias empatadas
- **Resolución del cuadro**: el ganador de cada llave sube de ronda automáticamente
- Flujo continuo: cuando un partido termina, arranca el siguiente

> Los nombres de jugadores son genéricos: es un **simulador**, no datos oficiales.
