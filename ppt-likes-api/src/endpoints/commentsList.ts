import { OpenAPIRoute } from "chanfana";
import { isAllowedLikeId } from "../allowedLikeIds";
import { clampCommentsLimit, isSupabaseConfigError, listVisibleComments } from "../supabase";
import { type AppContext, CommentsListResponse, createErrorResponse, ErrorResponse, likeIdPattern } from "../types";

export class CommentsList extends OpenAPIRoute {
	schema = {
		tags: ["Comments"],
		summary: "Get visible comments for one item",
		responses: {
			"200": {
				description: "Returns visible comments for one item",
				content: {
					"application/json": {
						schema: CommentsListResponse,
					},
				},
			},
			"400": {
				description: "Invalid or unknown item id",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
			"503": {
				description: "Supabase is not configured or unavailable",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const itemId = c.req.query("itemId")?.trim().toLowerCase();
		if (!itemId || !likeIdPattern.test(itemId)) {
			return c.json(createErrorResponse("Invalid itemId"), 400);
		}

		if (!isAllowedLikeId(itemId)) {
			return c.json(createErrorResponse("Unknown itemId"), 400);
		}

		try {
			const limit = clampCommentsLimit(c.req.query("limit") ?? null);
			const { comments, count } = await listVisibleComments(c.env, itemId, limit);
			return c.json({
				success: true,
				itemId,
				count,
				comments,
			});
		} catch (error) {
			console.warn("Unable to load comments.", error);
			if (isSupabaseConfigError(error)) {
				return c.json(createErrorResponse(`${error instanceof Error ? error.message : "Supabase is not configured"}. Check local .dev.vars or Worker secrets.`), 503);
			}

			return c.json(createErrorResponse("Comments are not available right now"), 503);
		}
	}
}
