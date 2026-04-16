import type { DatabaseOrTransaction } from "@workspace/database/client";
import type { AppEnvParsed } from "../../shared/env";
import { ItemRepository } from "./items.repository";
import { ItemService } from "./items.service";
import { createItemMapper } from "./items.mapper";

export const ItemFactory = {
	createService(db: DatabaseOrTransaction, env: AppEnvParsed): ItemService {
		const repo = new ItemRepository(db);
		const mapper = createItemMapper(env.ASSETS_BASE_URL);
		return new ItemService(repo, mapper);
	},
};
