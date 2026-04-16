import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export function createDb(connectionString: string) {
	// `prepare: false` is required when using connection poolers (e.g. pgBouncer, Hyperdrive)
	const client = postgres(connectionString, { prepare: false });
	return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DatabaseOrTransaction = Database | Transaction;
