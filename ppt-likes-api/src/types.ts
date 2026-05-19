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

export const CommentCreateBody = z.object({
	itemId: z
		.string()
		.regex(likeIdPattern, "itemId must contain only lowercase letters, numbers, and hyphens")
		.openapi({ example: "ppt-ai-impact-on-modern-life" }),
	content: z.string().trim().min(1).max(500).openapi({ example: "这个 PPT 很不错" }),
});

export const CommentResponseItem = z.object({
	id: z.string().uuid(),
	itemId: z.string(),
	author: z.string(),
	content: z.string(),
	createdAt: z.string(),
});

export const CommentsListResponse = z.object({
	success: z.literal(true),
	itemId: z.string(),
	count: z.number().int().nonnegative(),
	comments: z.array(CommentResponseItem),
});

export const CommentCreateResponse = z.object({
	success: z.literal(true),
	comment: CommentResponseItem,
});

export const ErrorResponse = z.object({
	success: z.literal(false),
	error: z.string(),
});

export function createErrorResponse(error: string) {
	return {
		success: false as const,
		error,
	};
}
