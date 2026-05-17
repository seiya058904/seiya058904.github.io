import type { Context } from "hono";
import { z } from "zod";

export type AppContext = Context<{ Bindings: Env }>;

export const likeIdPattern = /^[a-z0-9-]+$/;

export const LikeAction = z.enum(["like", "unlike"]);

export const LikeMutationBody = z.object({
	itemId: z
		.string()
		.regex(likeIdPattern, "itemId must contain only lowercase letters, numbers, and hyphens")
		.openapi({ example: "ppt-ai-impact-on-modern-life" }),
	action: LikeAction.openapi({ example: "like" }),
});

export const LikesResponse = z.object({
	success: z.literal(true),
	likes: z.record(z.string(), z.number().int().nonnegative()),
});

export const LikeMutationResponse = z.object({
	success: z.literal(true),
	itemId: z.string(),
	count: z.number().int().nonnegative(),
});

export const ErrorResponse = z.object({
	success: z.literal(false),
	error: z.string(),
});
