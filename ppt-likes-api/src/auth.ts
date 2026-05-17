const textEncoder = new TextEncoder();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 6;

function toBase64Url(input: string) {
	return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
	const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
	const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
	return atob(`${normalized}${padding}`);
}

async function signPayload(payload: string, secret: string) {
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign("HMAC", cryptoKey, textEncoder.encode(payload));
	const signatureBytes = Array.from(new Uint8Array(signature))
		.map((byte) => String.fromCharCode(byte))
		.join("");

	return toBase64Url(signatureBytes);
}

export async function createAdminToken(secret: string) {
	const expiresAt = Date.now() + TOKEN_TTL_MS;
	const payload = JSON.stringify({ exp: expiresAt });
	const payloadEncoded = toBase64Url(payload);
	const signature = await signPayload(payloadEncoded, secret);

	return {
		token: `${payloadEncoded}.${signature}`,
		expiresAt: new Date(expiresAt).toISOString(),
	};
}

export async function verifyAdminToken(token: string | undefined, secret: string) {
	if (!token || !secret) {
		return false;
	}

	const [payloadEncoded, signature] = token.split(".");
	if (!payloadEncoded || !signature) {
		return false;
	}

	const expectedSignature = await signPayload(payloadEncoded, secret);
	if (signature !== expectedSignature) {
		return false;
	}

	try {
		const payload = JSON.parse(fromBase64Url(payloadEncoded));
		return typeof payload.exp === "number" && payload.exp > Date.now();
	} catch {
		return false;
	}
}

export function extractBearerToken(authorizationHeader: string | undefined) {
	if (!authorizationHeader?.startsWith("Bearer ")) {
		return null;
	}

	return authorizationHeader.slice("Bearer ".length).trim() || null;
}
