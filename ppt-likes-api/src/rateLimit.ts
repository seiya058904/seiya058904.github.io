const RATE_LIMIT_PREFIX = "rate-limit:";
const RATE_LIMIT_WINDOW_SECONDS = 15;
const RATE_LIMIT_STORAGE_TTL_SECONDS = 60;

function getRateLimitKey(ip: string, itemId: string) {
	return `${RATE_LIMIT_PREFIX}${ip}:${itemId}`;
}

export function getClientIp(request: Request) {
	const cloudflareIp = request.headers.get("CF-Connecting-IP")?.trim();
	if (cloudflareIp) {
		return cloudflareIp;
	}

	const forwardedFor = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
	if (forwardedFor) {
		return forwardedFor;
	}

	return null;
}

export async function assertLikeRateLimit(namespace: KVNamespace, ip: string, itemId: string) {
	const key = getRateLimitKey(ip, itemId);
	const existing = await namespace.get(key);
	const now = Date.now();

	if (existing) {
		const lastRequestAt = Number.parseInt(existing, 10);
		if (Number.isFinite(lastRequestAt) && now - lastRequestAt < RATE_LIMIT_WINDOW_SECONDS * 1000) {
			return {
				allowed: false as const,
				retryAfterSeconds: RATE_LIMIT_WINDOW_SECONDS,
			};
		}
	}

	await namespace.put(key, String(now), {
		// Cloudflare KV requires expiration_ttl to be at least 60 seconds.
		expirationTtl: RATE_LIMIT_STORAGE_TTL_SECONDS,
	});

	return {
		allowed: true as const,
		retryAfterSeconds: 0,
	};
}
