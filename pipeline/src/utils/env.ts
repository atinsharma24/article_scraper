/**
 * Environment variable utilities
 */

export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

export function parseMaxUpdatesPerRun(): number {
	const raw = String(process.env.MAX_UPDATES_PER_RUN ?? '1').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n > 0) return Math.floor(n);
	return 1;
}

export function parseMaxCompetitorChars(): number {
	const raw = String(process.env.MAX_COMPETITOR_CHARS ?? '12000').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n > 100) return Math.floor(n);
	return 12000;
}
