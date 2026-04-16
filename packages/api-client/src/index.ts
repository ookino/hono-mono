import { hc } from "hono/client";
import type { AppType } from "../../../apps/api/src";

export const apiClient = (baseURL: string) =>
	hc<AppType>(baseURL, {
		init: { credentials: "include" },
	});

export type ApiClient = ReturnType<typeof apiClient>;

// Re-export Hono type utilities so consumers don't need hono as a direct dep
export type { InferRequestType, InferResponseType } from "hono/client";
