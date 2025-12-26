/**
 * Fetch with retry utility for network resilience.
 *
 * Implements exponential backoff retry logic for transient network failures.
 * Use this for critical fetches that should recover from temporary issues.
 */

export interface RetryOptions {
	/** Maximum number of retry attempts (default: 3) */
	maxRetries?: number;
	/** Initial delay in milliseconds (default: 1000) */
	initialDelayMs?: number;
	/** Maximum delay cap in milliseconds (default: 10000) */
	maxDelayMs?: number;
	/** Delay multiplier for exponential backoff (default: 2) */
	backoffMultiplier?: number;
	/** HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504]) */
	retryStatusCodes?: number[];
	/** Callback for retry events (useful for logging/telemetry) */
	onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Fetch with automatic retry on failure.
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @param retryOptions - Retry configuration
 * @returns Promise resolving to the Response
 * @throws Error after all retries exhausted
 *
 * @example
 * ```typescript
 * // Basic usage
 * const response = await fetchWithRetry('/api/data');
 *
 * // With custom options
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ key: 'value' })
 * }, {
 *   maxRetries: 5,
 *   onRetry: (attempt, error) => console.log(`Retry ${attempt}: ${error.message}`)
 * });
 * ```
 */
export async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	retryOptions: RetryOptions = {}
): Promise<Response> {
	const {
		maxRetries = 3,
		initialDelayMs = 1000,
		maxDelayMs = 10000,
		backoffMultiplier = 2,
		retryStatusCodes = DEFAULT_RETRY_STATUS_CODES,
		onRetry
	} = retryOptions;

	let lastError: Error | null = null;
	let delay = initialDelayMs;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url, options);

			// Check if we should retry based on status code
			if (retryStatusCodes.includes(response.status) && attempt < maxRetries) {
				const error = new Error(`Server error: ${response.status} ${response.statusText}`);
				lastError = error;

				if (onRetry) {
					onRetry(attempt + 1, error, delay);
				}

				await sleep(delay);
				delay = Math.min(delay * backoffMultiplier, maxDelayMs);
				continue;
			}

			return response;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Don't retry if request was aborted
			if (lastError.name === 'AbortError') {
				throw lastError;
			}

			if (attempt < maxRetries) {
				if (onRetry) {
					onRetry(attempt + 1, lastError, delay);
				}

				await sleep(delay);
				delay = Math.min(delay * backoffMultiplier, maxDelayMs);
			}
		}
	}

	throw lastError || new Error('Fetch failed after retries');
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a fetch function with pre-configured retry options.
 * Useful for creating API-specific fetch wrappers.
 *
 * @example
 * ```typescript
 * const apiClient = createRetryFetch({
 *   maxRetries: 5,
 *   initialDelayMs: 500,
 *   onRetry: (attempt, error) => {
 *     analytics.track('api_retry', { attempt, error: error.message });
 *   }
 * });
 *
 * const response = await apiClient('/api/endpoint');
 * ```
 */
export function createRetryFetch(defaultRetryOptions: RetryOptions = {}) {
	return (url: string, options: RequestInit = {}, retryOptions: RetryOptions = {}) =>
		fetchWithRetry(url, options, { ...defaultRetryOptions, ...retryOptions });
}
