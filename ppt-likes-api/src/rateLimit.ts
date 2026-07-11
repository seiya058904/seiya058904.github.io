const RATE_LIMIT_PREFIX = "rate-limit:";
const RATE_LIMIT_WINDOW_SECONDS = 15;
const RATE_LIMIT_STORAGE_TTL_SECONDS = 60;
const ADMIN_LOGIN_RATE_LIMIT_PREFIX = "admin-login:";
const ADMIN_LOGIN_WINDOW_SECONDS = 60;
export const ADMIN_LOGIN_MAX_FAILURES = 5;

function getRateLimitKey(ip: string, itemId: string) {
	return `${RATE_LIMIT_PREFIX}${ip}:${itemId}`;
}

function getAdminLoginRateLimitKey(ip: string) {
	return `${ADMIN_LOGIN_RATE_LIMIT_PREFIX}${ip}`;
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

export async function checkAdminLoginRateLimit(namespace: KVNamespace, ip: string) {
	const current = await namespace.get(getAdminLoginRateLimitKey(ip));
	const failures = Number.parseInt(current ?? "0", 10);

	return {
		allowed: !Number.isFinite(failures) || failures < ADMIN_LOGIN_MAX_FAILURES,
		retryAfterSeconds: ADMIN_LOGIN_WINDOW_SECONDS,
	};
}

export async function recordAdminLoginFailure(namespace: KVNamespace, ip: string) {
	// ponytail: KV counter is approximate under concurrent attempts; use a Durable Object per IP if strict enforcement is required.
	const key = getAdminLoginRateLimitKey(ip);
	const current = await namespace.get(key);
	const failures = Number.parseInt(current ?? "0", 10);
	const nextFailures = Math.min(
		ADMIN_LOGIN_MAX_FAILURES,
		(Number.isFinite(failures) ? failures : 0) + 1,
	);

	await namespace.put(key, String(nextFailures), {
		expirationTtl: ADMIN_LOGIN_WINDOW_SECONDS,
	});
}
