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
	content: z.string().trim().min(1).max(500).openapi({ example: "This PPT is helpful" }),
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

export const ProfileResponseItem = z.object({
	id: z.string().uuid(),
	displayName: z.string(),
});

export const ProfileGetResponse = z.object({
	success: z.literal(true),
	profile: ProfileResponseItem.nullable(),
});

export const ProfileUpsertBody = z.object({
	displayName: z
		.string()
		.regex(/^[一-鿿A-Za-z0-9 _-]+$/, "Display name contains invalid characters")
		.min(2)
		.max(24)
		.openapi({ example: "Seiya" }),
});

export const ProfileUpsertResponse = z.object({
	success: z.literal(true),
	profile: ProfileResponseItem,
});

export const ErrorResponse = z.object({
	success: z.literal(false),
	code: z.string().optional(),
	error: z.string(),
});

export const AdminLoginResponse = z.object({
	success: z.literal(true),
	token: z.string(),
	expiresAt: z.string(),
});

export const AdminLikesBody = z.object({
	itemId: z.string().regex(likeIdPattern),
	count: z.number().int().min(0).max(999999),
});

export const AdminLikesSetResponse = z.object({
	success: z.literal(true),
	itemId: z.string(),
	count: z.number().int().nonnegative(),
});

export const AdminLikesResetResponse = z.object({
	success: z.literal(true),
	itemId: z.string(),
	count: z.literal(0),
});

export function createErrorResponse(error: string, code?: string) {
	return {
		success: false as const,
		...(code ? { code } : {}),
		error,
	};
}
