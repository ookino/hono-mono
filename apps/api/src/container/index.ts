import type { Context } from "hono";
import type { AppBindings } from "../shared/types";
import type { DatabaseOrTransaction } from "@workspace/database/client";
import { ItemFactory } from "../modules/items/items.factory";
import { getEnv } from "../shared/env";

function buildServices(db: DatabaseOrTransaction) {
	const env = getEnv();
	return {
		items: ItemFactory.createService(db, env),
	};
}

export function createContainer(c: Context<AppBindings>) {
	const db = c.var.db;
	const services = buildServices(db);

	return {
		...services,
		withTransaction: <T>(fn: (ctx: ReturnType<typeof buildServices>) => Promise<T>): Promise<T> =>
			db.transaction((tx) => fn(buildServices(tx))),
	};
}

export type RoutesContainer = ReturnType<typeof createContainer>;
