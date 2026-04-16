import * as p from "@clack/prompts";
import degit from "degit";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const REPO = "ookino/hono-mono#v0.1.0";

type Platform = "mixed" | "bun" | "cf";

async function main() {
	console.clear();

	p.intro(`
█░█ █▀█ █▄░█ █▀█   █▀▄▀█ █▀█ █▄░█ █▀█
█▀█ █▄█ █░▀█ █▄█   █░▀░█ █▄█ █░▀█ █▄█
`);

	const name = await p.text({
		message: "Project name",
		placeholder: "my-app",
		validate: (v) => {
			if (!v) return "Required";
			if (!/^[a-z0-9-]+$/.test(v)) return "Lowercase letters, numbers, and hyphens only";
			if (existsSync(v)) return `Directory "${v}" already exists`;
		},
	});
	if (p.isCancel(name)) { p.cancel("Cancelled"); process.exit(0); }

	const platform = await p.select<Platform>({
		message: "Deployment target",
		options: [
			{
				value: "mixed",
				label: "Mixed",
				hint: "API: Bun + Postgres  ·  Web: Cloudflare Workers",
			},
			{
				value: "bun",
				label: "Bun stack",
				hint: "API: Bun + Postgres  ·  Web: Bun (self-hosted)",
			},
			{
				value: "cf",
				label: "Cloudflare Workers",
				hint: "API: CF Workers + Hyperdrive  ·  Web: CF Workers",
			},
		],
	});
	if (p.isCancel(platform)) { p.cancel("Cancelled"); process.exit(0); }

	const s = p.spinner();

	s.start("Cloning template");
	const emitter = degit(REPO, { cache: false, force: true });
	await emitter.clone(name as string);
	s.stop("Template cloned");

	s.start("Applying platform patches");
	applyPatch(name as string, platform as Platform);
	s.stop("Platform configured");

	s.start("Renaming project");
	renameProject(name as string);
	s.stop("Project renamed");

	const shouldInstall = await p.confirm({
		message: "Install dependencies now?",
		initialValue: true,
	});
	if (p.isCancel(shouldInstall)) { p.cancel("Cancelled"); process.exit(0); }

	if (shouldInstall) {
		s.start("Installing dependencies");
		execSync("bun install", { cwd: name as string, stdio: "pipe" });
		s.stop("Dependencies installed");
	}

	const needsDocker = platform === "bun" || platform === "mixed";

	p.note(
		[
			`cd ${name as string}`,
			"cp apps/api/.env.example apps/api/.env",
			"cp apps/web/.env.example apps/web/.env",
			needsDocker ? "docker compose up -d" : "",
			needsDocker ? "bun run --filter '@workspace/database' db:migrate" : "",
			!shouldInstall ? "bun install" : "",
			"bun dev",
		]
			.filter(Boolean)
			.join("\n"),
		"Next steps",
	);

	p.outro("Happy building!");
	process.exit(0);
}

// ---------------------------------------------------------------------------
// Patches
// ---------------------------------------------------------------------------

function applyPatch(dir: string, platform: Platform) {
	if (platform === "mixed") return; // template ships as mixed — nothing to do

	if (platform === "bun") patchWebForBun(dir);
	if (platform === "cf") patchApiForCf(dir);
}

function patchWebForBun(dir: string) {
	// Swap vite.config — remove @cloudflare/vite-plugin, use plain TanStack Start
	writeFileSync(
		join(dir, "apps/web/vite.config.ts"),
		`import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
\tplugins: [
\t\tviteTsConfigPaths({ projects: ["./tsconfig.json"] }),
\t\ttailwindcss(),
\t\ttanstackStart(),
\t\tviteReact(),
\t],
})
`,
	);

	// Drop wrangler.jsonc — not needed for Bun
	const wranglerPath = join(dir, "apps/web/wrangler.jsonc");
	if (existsSync(wranglerPath)) unlinkSync(wranglerPath);

	// Update apps/web/package.json
	const pkgPath = join(dir, "apps/web/package.json");
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	delete pkg.devDependencies["@cloudflare/vite-plugin"];
	delete pkg.devDependencies["wrangler"];
	delete pkg.scripts["deploy"];
	delete pkg.scripts["cf-typegen"];
	pkg.scripts["start"] = "vite preview";
	writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function patchApiForCf(dir: string) {
	// Remove Bun.serve — CF Workers only needs `export default app`
	const indexPath = join(dir, "apps/api/src/index.ts");
	const content = readFileSync(indexPath, "utf8");
	writeFileSync(indexPath, content.replace("\nBun.serve({ fetch: app.fetch, port: 3001 });\n", "\n"));

	// Add wrangler.jsonc for the API Worker
	writeFileSync(
		join(dir, "apps/api/wrangler.jsonc"),
		`{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "api",
  "compatibility_date": "2026-04-16",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/index.ts",
  "observability": { "enabled": true },
  // Hyperdrive proxies your Postgres connection from a CF Worker.
  // Create a config: wrangler hyperdrive create my-hyperdrive --connection-string="<DATABASE_URL>"
  // Then replace the id below with the one Wrangler prints.
  "hyperdrive": [
    {
      "binding": "DATABASE_URL",
      "id": "<YOUR_HYPERDRIVE_CONFIG_ID>"
    }
  ]
}
`,
	);

	// Update apps/api/package.json — add wrangler devDep + deploy script
	const pkgPath = join(dir, "apps/api/package.json");
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	pkg.devDependencies = pkg.devDependencies ?? {};
	pkg.devDependencies["wrangler"] = "^4.0.0";
	pkg.scripts["deploy"] = "wrangler deploy";
	pkg.scripts["cf-typegen"] = "wrangler types";
	delete pkg.scripts["start"];
	writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Rename root package.json name field to match project directory
// ---------------------------------------------------------------------------

function renameProject(dir: string) {
	const pkgPath = join(dir, "package.json");
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	pkg.name = dir;
	writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
