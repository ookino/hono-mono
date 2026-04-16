import type { Database } from "@workspace/database/client";
import type { RoutesContainer } from "../container/index";

export interface AppEnv {
	DATABASE_URL: string;
	WEB_APP_URL: string;
	ASSETS_BASE_URL: string;
	JWT_SECRET: string;
}

export interface AppVariables {
	db: Database;
	user: AuthUser | null;
	container: RoutesContainer;
}

export interface AuthUser {
	id: string;
	email: string;
	name: string | null;
}

export type AppBindings = {
	Bindings: AppEnv;
	Variables: AppVariables;
};
