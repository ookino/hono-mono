import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	WEB_APP_URL: z.string().url(),
	ASSETS_BASE_URL: z.string().url(),
	JWT_SECRET: z.string().min(32),
});

export type AppEnvParsed = z.infer<typeof envSchema>;

let _env: AppEnvParsed;

export function getEnv(): AppEnvParsed {
	if (!_env) {
		_env = envSchema.parse(process.env);
	}
	return _env;
}
