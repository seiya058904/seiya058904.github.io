const MAX_COMMENTS_LIMIT = 50;
const COMMENT_REPEAT_WINDOW_MS = 10 * 1000;

type SupabaseUser = {
	id: string;
	email?: string;
};

type SupabaseCommentRow = {
	id: string;
	item_id: string;
	user_id: string;
	user_email: string | null;
	content: string;
	created_at: string;
};

export type SupabaseProfile = {
	id: string;
	displayName: string;
};

type SupabaseProfileRow = {
	id: string;
	display_name: string;
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

export function validateDisplayName(rawName: unknown) {
	if (typeof rawName !== "string") {
		return {
			valid: false,
			value: "",
			error: "Display name is required",
		};
	}

	const value = rawName.trim().replace(/\s+/g, " ");
	if (value.length < 2 || value.length > 24) {
		return {
			valid: false,
			value,
			error: "Display name must be 2 to 24 characters",
		};
	}

	if (/[<>]/.test(value)) {
		return {
			valid: false,
			value,
			error: "Display name cannot contain < or >",
		};
	}

	if (/^\d+$/.test(value)) {
		return {
			valid: false,
			value,
			error: "Display name cannot be only numbers",
		};
	}

	if (!/^[\u4e00-\u9fffA-Za-z0-9 _-]+$/u.test(value)) {
		return {
			valid: false,
			value,
			error: "Display name can use Chinese, letters, numbers, spaces, hyphens, or underscores",
		};
	}

	return {
		valid: true,
		value,
		error: "",
	};
}

function getDefaultDisplayName(userId: string) {
	const suffix = userId.replace(/-/g, "").slice(0, 4).toUpperCase() || "0000";
	return `User-${suffix}`;
}

function toPublicComment(row: SupabaseCommentRow, profiles: Map<string, string> = new Map()): PublicComment {
	return {
		id: row.id,
		itemId: row.item_id,
		author: profiles.get(row.user_id) || "User",
		content: row.content,
		createdAt: row.created_at,
	};
}

function toPublicProfile(row: SupabaseProfileRow): SupabaseProfile {
	return {
		id: row.id,
		displayName: row.display_name,
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
		select: "id,item_id,user_id,user_email,content,created_at",
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
	const profiles = await getPublicProfilesForComments(env, rows);
	const comments = rows.map((row) => toPublicComment(row, profiles)).reverse();
	return {
		comments,
		count: getCountFromContentRange(response.headers.get("Content-Range"), comments.length),
	};
}

async function getPublicProfilesForComments(env: Env, rows: SupabaseCommentRow[]) {
	const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
	const profiles = new Map<string, string>();
	if (!userIds.length) {
		return profiles;
	}

	const { url, anonKey } = getSupabasePublicConfig(env);
	const search = new URLSearchParams({
		select: "id,display_name",
		id: `in.(${userIds.join(",")})`,
	});

	const response = await fetch(`${url}/rest/v1/profiles?${search.toString()}`, {
		method: "GET",
		headers: {
			apikey: anonKey,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		return profiles;
	}

	const profileRows = (await response.json()) as SupabaseProfileRow[];
	profileRows.forEach((profile) => {
		if (profile.id && profile.display_name) {
			profiles.set(profile.id, profile.display_name);
		}
	});

	return profiles;
}

export async function getUserProfile(env: Env, userId: string): Promise<SupabaseProfile | null> {
	const { url, serviceRoleKey } = getSupabaseServiceConfig(env);
	const search = new URLSearchParams({
		select: "id,display_name",
		id: `eq.${userId}`,
		limit: "1",
	});

	const response = await fetch(`${url}/rest/v1/profiles?${search.toString()}`, {
		method: "GET",
		headers: {
			apikey: serviceRoleKey,
			Authorization: `Bearer ${serviceRoleKey}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error("Unable to load profile");
	}

	const rows = (await response.json()) as SupabaseProfileRow[];
	const row = rows.at(0);
	return row ? toPublicProfile(row) : null;
}

export async function ensureUserProfile(env: Env, userId: string): Promise<SupabaseProfile> {
	const existingProfile = await getUserProfile(env, userId);
	if (existingProfile) {
		return existingProfile;
	}

	return upsertUserProfile(env, userId, getDefaultDisplayName(userId));
}

export async function upsertUserProfile(env: Env, userId: string, displayName: string): Promise<SupabaseProfile> {
	const { url, serviceRoleKey } = getSupabaseServiceConfig(env);
	const response = await fetch(`${url}/rest/v1/profiles?on_conflict=id&select=id,display_name`, {
		method: "POST",
		headers: {
			apikey: serviceRoleKey,
			Authorization: `Bearer ${serviceRoleKey}`,
			"Content-Type": "application/json",
			Accept: "application/json",
			Prefer: "resolution=merge-duplicates,return=representation",
		},
		body: JSON.stringify({
			id: userId,
			display_name: displayName,
		}),
	});

	if (!response.ok) {
		throw new Error("Unable to save profile");
	}

	const rows = (await response.json()) as SupabaseProfileRow[];
	const row = rows.at(0);
	if (!row) {
		throw new Error("Supabase did not return the saved profile");
	}

	return toPublicProfile(row);
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
	const profile = await ensureUserProfile(env, user.id);

	const response = await fetch(`${url}/rest/v1/comments?select=id,item_id,user_id,user_email,content,created_at`, {
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

	return toPublicComment(row, new Map([[profile.id, profile.displayName]]));
}
