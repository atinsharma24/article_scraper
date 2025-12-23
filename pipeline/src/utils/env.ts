/**
 * Environment variable utilities
 */

/**
 * Require an environment variable to be set
 * @param name - The name of the environment variable
 * @returns The value of the environment variable
 * @throws Error if the environment variable is not set
 */
export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

/**
 * Parse MAX_UPDATES_PER_RUN from environment with validation
 * @returns The number of updates per run (default: 1)
 */
export function parseMaxUpdatesPerRun(): number {
	const raw = String(process.env.MAX_UPDATES_PER_RUN ?? '1').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n > 0) return Math.floor(n);
	return 1;
}

/**
 * Parse MAX_COMPETITOR_CHARS from environment with validation
 * @returns The maximum characters from competitor articles (default: 12000)
 */
export function parseMaxCompetitorChars(): number {
	const raw = String(process.env.MAX_COMPETITOR_CHARS ?? '12000').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n > 100) return Math.floor(n);
	return 12000;
}
