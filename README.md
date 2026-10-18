# @libs/prisma

> The workspace's Prisma orchestration layer — a TypeScript rewrite of the old
> `prisma.sh`: CLI runners, a cache-aware `generate`, a push→generate→seed→studio
> pipeline, connection URL builders, and a runtime client/adapter factory.

| Field   | Value           |
| ------- | --------------- |
| Package | `@libs/prisma`  |
| Layer   | `libs`          |
| Kind    | Prisma orchestration library |
| Tags    | `ts:lib`, `scope:libs` |
| Runtime | `node-only`     |
| Status  | `active`        |

## Purpose & Scope

Owns every Prisma execution concern in the workspace: spawning the Prisma CLI,
caching `generate` against a schema manifest, orchestrating the setup/start
pipeline, seeding, launching Studio, building driver connection URLs, and
constructing `PrismaClient` instances with cached driver adapters. It is the single
layer the rest of the workspace calls to run Prisma.

It does **not** own the schema files (each consumer keeps its own under
`src/prisma/<ots>`) and provides no Nest `@Module` / provider wrapping — the
NestJS-facing side lives in `libs/nestjs/prisma`.

## Directory Map

```text
libs/prisma/src/
├── cache/        # schema manifest (atomic write) + .prisma dir discovery
├── cli/          # generate / db push runners + path, env, cleanup utils
├── config/       # createPrismaConfig, seed command, schema output check
├── connection/   # Postgres / MongoDB connection URL builders
├── constants/    # PRISMA.* namespace (SSoT values + types)
├── pipeline/     # push -> generate -> seed -> studio orchestrator
├── runtime/      # client factory + adapter cache + SQLite client
├── seed/         # vite-node seed runner
├── studio/       # detached Prisma Studio launcher
├── types/        # .d.ts type SSoT barrel
└── index.ts      # public barrel
```

## Key Capabilities

1. **CLI runners** — `generatePrismaClient` (cache-aware, layout/env-validated) and `pushPrismaSchema` (`db push` with `--force-reset` / `--accept-data-loss`).
2. **Schema cache** — `withSchemaCache` / `isSchemaCached` skip `generate` when the v1 manifest (atomic tmp→rename) matches current schema `size` / `mtimeMs`; `collectPrismaClientDirs` walks the workspace for `.prisma` dirs.
3. **Pipeline** — `runPrismaPipeline` runs `push → generate → seed → studio`, classifies retries (`PUSH_INVALID_OPTION`, `PUSH_DB_OR_SCHEMA_ERROR`, `SEED_SCRIPT_FAILED`, `GENERATE_OUTPUT_CORRUPT`), and only `--force-reset`s on attempt 0.
4. **Seed** — `seedExists` / `runPrismaSeed` (npx `vite-node` with `TARGET` routing) / `assertSeedResultOk`.
5. **Studio** — `startPrismaStudio` spawns a detached, `unref()`-ed process so it outlives the parent.
6. **Connection builders** — `buildPrismaPostgresConnectionUrl` (`prisma+postgres://`) and `buildPrismaMongodbConnectionUrl`, container-aware via `getOtsConfig`.
7. **Config** — `createPrismaConfig` builds a `prisma/config` object (schema dir + datasource URL + seed command); `checkPrismaSchema` enforces `PRISMA_CLIENT_OUTPUT`.
8. **Runtime factory** — `createPrismaClient` + `getOrCreateAdapter` (cached) and `sqlitePrismaClient` (better-sqlite3 adapter).

## Usage

```ts
import { runPrismaPipeline } from '@libs/prisma';

const result = await runPrismaPipeline({
  action: 'setup',
  env: {
    DATABASE_TYPE: 'postgres',
    OTS_NAME: 'main',
    PRISMA_CLIENT_OUTPUT: './generated/prisma/main',
  },
});

if (!result.ok) throw new Error(`pipeline failed at ${result.lastFailure?.failedStage}`);
```

## Public API

- CLI: `generatePrismaClient`, `pushPrismaSchema`, `resolvePrismaBin`, `runPrismaCli`, `getPrismaSchemaDir`, `getPrismaConfigPath`, `getClientOutputDir`, `getManifestPath`, `isOutputIntact`, `buildPrismaEnv`, `validatePrismaProjectLayout`, `cleanPrismaArtifacts`.
- Cache / pipeline: `withSchemaCache`, `isSchemaCached`, `writeManifest`, `collectSchemaFiles`, `collectPrismaClientDirs`, `runPrismaPipeline`.
- Seed / Studio: `seedExists`, `runPrismaSeed`, `assertSeedResultOk`, `startPrismaStudio`.
- Connection / config: `buildPrismaPostgresConnectionUrl`, `buildPrismaMongodbConnectionUrl`, `createPrismaConfig`, `getPrismaSeedCommand`, `checkPrismaSchema`.
- Runtime: `createPrismaClient`, `getOrCreateAdapter`, `sqlitePrismaClient`, `AdapterFactory`, `PrismaClassConstructor`.
- Types / constants: `PRISMA`, `PrismaEnv`, `PrismaDatabaseType`, `PrismaOtsName`, `PrismaAction`, `PipelineOptions`, `PipelineResult`.
- Import path: `@libs/prisma`

## Dependencies

- **Depends on**: `@infra/config` — `getOtsConfig` and the `OtsInstanceName<T>` type behind `PrismaOtsName`.
- **Depends on**: `@infra/definitions` — the `DOCKER` / `PORTS` / `PATH` constants and `Docker` / `NX` / `Runner` types the connection builder and CLI utils read.
- **Depends on**: `@infra/kits` — the tsconfig and project-schema presets this project extends at build time; no `src/**` import.
- **Depends on**: `@infra/testing` — the Vitest harness every `*.test.ts` imports; test-only.
- **Depends on**: `@infra/utils` — declared in the manifest; the connection builder deliberately re-implements `isRunningInContainer` instead of a deep import (Barrel Import Only).
- **Depends on**: `@prisma/adapter-better-sqlite3` — the `PrismaBetterSqlite3` driver adapter used by `sqlitePrismaClient`.
- **Depends on**: `better-sqlite3` — the native driver the SQLite adapter wraps; the caller's workspace must have it installed.
- **Referenced by**: `apps/servers/api`, `domains/structure`, `libs/e2e`, `libs/infra/runtime`, `libs/nestjs/prisma`

## Boundaries

- Source headers still label the package `@infra/prisma` (migrated names); the Nx project — and therefore the import path — is `@libs/prisma`.
- The root barrel eagerly imports `@prisma/adapter-better-sqlite3` (via `runtime/sqlite-client.ts`), so any consumer of `@libs/prisma` must resolve `better-sqlite3`.
- `pushPrismaSchema` is a schema-only development `db push`; production migrations are out of scope (the source warns to use `prisma migrate deploy`).

## Environment & Config

- `DATABASE_TYPE` (`postgres` | `mongodb`) and `OTS_NAME` (e.g. `main`) are required — they drive the schema dir, datasource URL, and seed routing.
- `PRISMA_CLIENT_OUTPUT` overrides the generate output dir (default `${projectRoot}/generated/prisma/<ots>`).
- `STAGE` selects the Postgres/MongoDB host (container vs `localhost`) and gates `getPrismaSeedCommand` to `local` / `staging`; `PRISMA.*` constants hold the pipeline defaults (retry 30, delay 3000 ms, Studio port 3000).

## Related Docs

- [README conventions]({projectRoot}/.agent/rules/readme-conventions.md)
- [Pipeline orchestrator](./src/pipeline/pipeline.ts) — the 4-stage retry flow in full
- [Schema cache manifest](./src/cache/manifest.ts) — the cache-hit contract
