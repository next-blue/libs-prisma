/**
 * @infra/prisma — CLI / Cleanup 관련 타입
 * ------------------------------------------------------------------
 * CLI 실행 (generate/push) 과 아티팩트 cleanup 에 공통으로 사용하는 타입 묶음.
 */

import type { PrismaEnv, PrismaOtsName, PrismaStdioMode } from './core';

export interface PrismaCliOptions {
  projectRoot: string;
  env: PrismaEnv;
  prismaBinPath?: string;
  /** stdout/stderr 스트림 연결 모드 (기본 'pipe' = 자동화에 적합) @see PrismaStdioMode */
  stdio?: PrismaStdioMode;
}

export interface PrismaCliResult {
  schemaDir: string;
  prismaConfigPath: string;
  clientOutputDir: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface GenerateOptions extends PrismaCliOptions {
  cache?: boolean;
}

export interface GenerateResult extends PrismaCliResult {
  cacheHit: boolean;
}

export interface PushOptions extends PrismaCliOptions {
  forceReset?: boolean;
  acceptDataLoss?: boolean;
  dbUrl?: string;
}

/**
 * `validatePrismaProjectLayout()` 유틸 반환 타입.
 * generate / db push / seed 등 모든 Prisma CLI 동작 시작 전에 공통으로
 * resolve 하고 검증해야 하는 디렉토리 / 설정 파일 경로 묶음.
 *
 * @see cli/utils.ts validatePrismaProjectLayout()
 */
export interface PrismaProjectLayoutContext {
  /** Schema .prisma 파일 디렉토리 (src/prisma/<ots>) */
  schemaDir: string;
  /** Prisma configuration 파일 절대 경로 (prisma.config.ts) */
  prismaConfigPath: string;
  /** @prisma/<ots> client generated output 절대 디렉토리 */
  clientOutputDir: string;
}

// 🧹 cleanup 모듈 타입 — Prisma generated artifacts 정리
/**
 * `cleanPrismaArtifacts()` 실행 옵션 SSoT.
 * Prisma 버전 업그레이드 / 캐시 corruption / schema 대규모 변경 등
 * "깨끗한 상태로 재생성" 이 필요할 때 client output 디렉토리를 통째로
 * 삭제하기 위한 옵션 묶음. (cache manifest 는 output 내부에 함께 있으므로 같이 삭제됨)
 *
 * ✨ 기본값 동작: dryRun=false, clientOutputDir 삭제
 *   (schema 파일 자체는 절대 건드리지 않음 — Precise Touch 원칙)
 */
export interface CleanupOptions {
  /** Operational Target Schema 인스턴스 이름 (예: 'main') */
  otsName: PrismaOtsName;
  /** OTS 가 속한 프로젝트 루트 (기본값 workspaceRoot) */
  projectRoot?: string;
  /**
   * 삭제할 Prisma Client output 절대 경로.
   * `PRISMA_CLIENT_OUTPUT` override 로 생성된 output 을 정확히 지우기 위해 사용.
   * 미지정시 `${projectRoot}/generated/prisma/${otsName}` 로 resolve 한다.
   */
  clientOutputDir?: string;
  /**
   * true 로 설정시 실제 fs.rm 을 실행하지 않고 삭제될 경로 리스트만 반환.
   * 파이프라인 시작 전 validation / 사용자에게 "이렇게 지워집니다" 미리 보여줄 때 사용.
   * @default false
   */
  dryRun?: boolean;
}

/**
 * `cleanPrismaArtifacts()` 반환 결과 SSoT.
 * 실제 삭제 여부 / 삭제된 경로 / dryRun 상태를 묶어 반환하여
 * 호출부에서 로그 출력 / 재시도 가이드 등을 유연하게 작성 가능.
 */
export interface CleanupResult {
  /** Operational Target Schema 인스턴스 이름 */
  otsName: PrismaOtsName;
  /** true = dryRun 으로 실행 (실제 fs 변화 없음) */
  dryRun: boolean;
  /** 삭제 대상이었던 경로 리스트 (dryRun일 때도 모두 채워서 반환) */
  removedPaths: string[];
  /**
   * 삭제 오류 발생시 기록. 기본적으로 정리 실패는 치명적 오류로 간주하지 않고
   * result.errors 에 담아 반환 — 호출부에서 경고 처리 가능.
   */
  errors: Array<{ path: string; message: string }>;
}
