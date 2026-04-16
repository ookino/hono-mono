import type { ErrorHandler } from "hono";
import type { AppBindings } from "../types";
import { AppException } from "./exceptions";

export const globalErrorHandler: ErrorHandler<AppBindings> = (err, c) => {
	if (err instanceof AppException) {
		return c.json(
			{ success: false, error: { code: err.code, message: err.message, details: err.details } },
			err.statusCode as any,
		);
	}

	console.error("[Unhandled Error]", err);

	return c.json(
		{ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } },
		500,
	);
};
