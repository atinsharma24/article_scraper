/**
 * Environment variable utilities
 */

/**
 * Require an environment variable to be set
 * @param {string} name - The name of the environment variable
 * @returns {string} The value of the environment variable
 * @throws {Error} If the environment variable is not set
 */
export function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

/**
 * Parse MAX_UPDATES_PER_RUN from environment with validation
 * @returns {number} The number of updates per run (default: 1)
 */
export function parseMaxUpdatesPerRun() {
	const raw = String(process.env.MAX_UPDATES_PER_RUN ?? '1').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n > 0) return Math.floor(n);
	return 1;
}

/**
 * Parse MAX_COMPETITOR_CHARS from environment with validation
 * @returns {number} The maximum characters from competitor articles (default: 12000)
 */
export function parseMaxCompetitorChars() {
	const raw = String(process.env.MAX_COMPETITOR_CHARS ?? '12000').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n > 100) return Math.floor(n);
	return 12000;
}
