const CORS_METHODS = "GET,POST,OPTIONS";
const CORS_HEADERS = "Content-Type";

type CorsOptions = {
	allowed: boolean;
	headers: Headers;
};

function splitOrigins(rawValue: string | undefined) {
	if (!rawValue) {
		return [];
	}

	return rawValue
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
}

export function getAllowedOrigins(env: Env) {
	const productionOrigins = splitOrigins(env.ALLOWED_ORIGIN);
	const devOrigins = String(env.ENVIRONMENT) === "development" ? splitOrigins(env.ALLOWED_DEV_ORIGINS) : [];
	return new Set([...productionOrigins, ...devOrigins]);
}

export function getCorsOptions(origin: string | undefined, env: Env): CorsOptions {
	const headers = new Headers();
	headers.set("Access-Control-Allow-Methods", CORS_METHODS);
	headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
	headers.set("Vary", "Origin");

	if (!origin) {
		return { allowed: true, headers };
	}

	if (getAllowedOrigins(env).has(origin)) {
		headers.set("Access-Control-Allow-Origin", origin);
		return { allowed: true, headers };
	}

	return { allowed: false, headers };
}
