import { AsyncLocalStorage } from "node:async_hooks";

export type SqlValue = string | number | null;

export interface PreparedStatement {
  bind(...values: SqlValue[]): PreparedStatement;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

// A small shared contract keeps local Node development independent of Workers types.
export interface AppDatabase {
  prepare(sql: string): PreparedStatement;
  /** D1 runs the statements in one transaction; use it whenever rows must move together. */
  batch(statements: PreparedStatement[]): Promise<unknown[]>;
}
const databaseContext = new AsyncLocalStorage<AppDatabase>();
export function withDatabase<T>(database: AppDatabase, callback: () => T): T {
  return databaseContext.run(database, callback);
}
export function getDatabase(): AppDatabase {
  const database = databaseContext.getStore();
  if (!database)
    throw new Error(
      "D1 requires the Cloudflare runtime; use pnpm dev:cloudflare",
    );
  return database;
}
