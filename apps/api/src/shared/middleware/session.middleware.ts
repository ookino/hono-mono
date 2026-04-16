import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types";
import { getEnv } from "../env";
import { UnauthorizedError } from "../errors/exceptions";

/**
 * Verifies the Bearer JWT and sets c.var.user.
 *
 * Uses the Web Crypto API (available on Bun + Cloudflare Workers).
 * Swap this out for your auth provider (Better Auth, Clerk, etc.) as needed.
 */
export const sessionMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
	const authHeader = c.req.header("Authorization");

	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);
		const user = await verifyJwt(token, getEnv().JWT_SECRET);
		c.set("user", user);
	} else {
		c.set("user", null);
	}

	return next();
};

/**
 * Require an authenticated session. Use after sessionMiddleware.
 */
export const requireSession: MiddlewareHandler<AppBindings> = async (c, next) => {
	if (!c.var.user) throw new UnauthorizedError();
	return next();
};

// ---------------------------------------------------------------------------
// Minimal HS256 JWT verification using the Web Crypto API
// ---------------------------------------------------------------------------

interface JwtPayload {
	sub: string;
	email: string;
	name?: string | null;
	exp?: number;
}

async function verifyJwt(token: string, secret: string) {
	try {
		const [headerB64, payloadB64, signatureB64] = token.split(".");
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

		const key = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["verify"],
		);

		const valid = await crypto.subtle.verify(
			"HMAC",
			key,
			base64UrlDecode(signatureB64),
			new TextEncoder().encode(`${headerB64}.${payloadB64}`),
		);

		if (!valid) return null;

		const payload = JSON.parse(
			new TextDecoder().decode(base64UrlDecode(payloadB64)),
		) as JwtPayload;

		if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

		return { id: payload.sub, email: payload.email, name: payload.name ?? null };
	} catch {
		return null;
	}
}

function base64UrlDecode(str: string): Uint8Array {
	const base64 = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
	return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
