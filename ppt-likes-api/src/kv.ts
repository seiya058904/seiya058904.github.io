const LIKE_KEY_PREFIX = "likes:";

function getKvKey(itemId: string) {
	return `${LIKE_KEY_PREFIX}${itemId}`;
}

export async function listLikes(namespace: KVNamespace) {
	const likes: Record<string, number> = {};
	let cursor: string | undefined;

	do {
		const page = await namespace.list({ prefix: LIKE_KEY_PREFIX, cursor });
		cursor = page.list_complete ? undefined : page.cursor;

		await Promise.all(
			page.keys.map(async ({ name }) => {
				const itemId = name.slice(LIKE_KEY_PREFIX.length);
				const rawCount = await namespace.get(name);
				const count = Number.parseInt(rawCount ?? "0", 10);
				likes[itemId] = Number.isFinite(count) && count >= 0 ? count : 0;
			}),
		);
	} while (cursor);

	return likes;
}

export async function mutateLikeCount(namespace: KVNamespace, itemId: string, action: "like" | "unlike") {
	const key = getKvKey(itemId);
	const rawCount = await namespace.get(key);
	const currentCount = Math.max(0, Number.parseInt(rawCount ?? "0", 10) || 0);
	const nextCount = action === "like" ? currentCount + 1 : Math.max(0, currentCount - 1);

	await namespace.put(key, String(nextCount));
	return nextCount;
}
