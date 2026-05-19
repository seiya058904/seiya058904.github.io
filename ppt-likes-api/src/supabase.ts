const MAX_COMMENTS_LIMIT = 50;
const COMMENT_REPEAT_WINDOW_MS = 10 * 1000;

type SupabaseUser = {
	id: string;
	email?: string;
};

type SupabaseCommentRow = {
	id: string;
	item_id: string;
	user_email: string | null;
	content: string;
	created_at: string;
};

type PublicComment = {
	id: string;
	itemId: string;
	author: string;
	content: string;
	createdAt: string;
};

function isMissingSecret(value: string | undefined) {
	return !value || value.startsWith("replace-with-");
}

function getSupabasePublicConfig(env: Env) {
	const url = env.SUPABASE_URL?.replace(/\/+$/, "");
	const anonKey = env.SUPABASE_ANON_KEY;

	if (isMissingSecret(url) || isMissingSecret(anonKey)) {
		throw new Error("Supabase public config is not configured");
	}

	return {
		url,
		anonKey,
	};
}

function getSupabaseServiceConfig(env: Env) {
	const url = env.SUPABASE_URL?.replace(/\/+$/, "");
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

	if (isMissingSecret(url) || isMissingSecret(serviceRoleKey)) {
		throw new Error("Supabase service role key is not configured");
	}

	return {
		url,
		serviceRoleKey,
	};
}

export function isSupabaseConfigError(error: unknown) {
	return error instanceof Error && error.message.startsWith("Supabase ") && error.message.endsWith(" is not configured");
}

function getAuthorName(email: string | null | undefined) {
	if (!email) {
		return "User";
	}

	const [prefix] = email.split("@");
	const cleanPrefix = prefix?.trim();
	return cleanPrefix || "User";
}

function toPublicComment(row: SupabaseCommentRow): PublicComment {
	return {
		id: row.id,
		itemId: row.item_id,
		author: getAuthorName(row.user_email),
		content: row.content,
		createdAt: row.created_at,
	};
}

async function readJsonResponse(response: Response) {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

function getCountFromContentRange(contentRange: string | null, fallback: number) {
	if (!contentRange) {
		return fallback;
	}

	const countText = contentRange.split("/").at(1);
	const count = Number.parseInt(countText ?? "", 10);
	return Number.isFinite(count) && count >= 0 ? count : fallback;
}

export function clampCommentsLimit(rawLimit: string | null) {
	const parsed = Number.parseInt(rawLimit ?? "", 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return MAX_COMMENTS_LIMIT;
	}

	return Math.min(parsed, MAX_COMMENTS_LIMIT);
}

export async function verifySupabaseUser(env: Env, accessToken: string): Promise<SupabaseUser | null> {
	const { url, anonKey } = getSupabasePublicConfig(env);
	const response = await fetch(`${url}/auth/v1/user`, {
		method: "GET",
		headers: {
			apikey: anonKey,
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		return null;
	}

	const payload = (await readJsonResponse(response)) as Partial<SupabaseUser> | null;
	if (!payload || typeof payload.id !== "string" || !payload.id) {
		return null;
	}

	return {
		id: payload.id,
		email: typeof payload.email === "string" ? payload.email : undefined,
	};
}

export async function listVisibleComments(env: Env, itemId: string, limit: number) {
	const { url, anonKey } = getSupabasePublicConfig(env);
	const search = new URLSearchParams({
		select: "id,item_id,user_email,content,created_at",
		item_id: `eq.${itemId}`,
		status: "eq.visible",
		order: "created_at.desc",
		limit: String(Math.min(limit, MAX_COMMENTS_LIMIT)),
	});

	const response = await fetch(`${url}/rest/v1/comments?${search.toString()}`, {
		method: "GET",
		headers: {
			apikey: anonKey,
			Accept: "application/json",
			Prefer: "count=exact",
		},
	});

	if (!response.ok) {
		throw new Error("Unable to load comments");
	}

	const rows = (await response.json()) as SupabaseCommentRow[];
	const comments = rows.map(toPublicComment).reverse();
	return {
		comments,
		count: getCountFromContentRange(response.headers.get("Content-Range"), comments.length),
	};
}

export async function hasRecentUserComment(env: Env, userId: string, itemId: string) {
	const { url, serviceRoleKey } = getSupabaseServiceConfig(env);
	const threshold = new Date(Date.now() - COMMENT_REPEAT_WINDOW_MS).toISOString();
	const search = new URLSearchParams({
		select: "id",
		user_id: `eq.${userId}`,
		item_id: `eq.${itemId}`,
		created_at: `gte.${threshold}`,
		limit: "1",
	});

	const response = await fetch(`${url}/rest/v1/comments?${search.toString()}`, {
		method: "GET",
		headers: {
			apikey: serviceRoleKey,
			Authorization: `Bearer ${serviceRoleKey}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error("Unable to check recent comment");
	}

	const rows = (await response.json()) as Array<{ id: string }>;
	return rows.length > 0;
}

export async function insertComment(env: Env, itemId: string, user: SupabaseUser, content: string) {
	const { url, serviceRoleKey } = getSupabaseServiceConfig(env);
	const response = await fetch(`${url}/rest/v1/comments?select=id,item_id,user_email,content,created_at`, {
		method: "POST",
		headers: {
			apikey: serviceRoleKey,
			Authorization: `Bearer ${serviceRoleKey}`,
			"Content-Type": "application/json",
			Accept: "application/json",
			Prefer: "return=representation",
		},
		body: JSON.stringify({
			item_id: itemId,
			user_id: user.id,
			user_email: user.email ?? null,
			content,
		}),
	});

	if (!response.ok) {
		throw new Error("Unable to save comment");
	}

	const rows = (await response.json()) as SupabaseCommentRow[];
	const row = rows.at(0);
	if (!row) {
		throw new Error("Supabase did not return the saved comment");
	}

	return toPublicComment(row);
}
