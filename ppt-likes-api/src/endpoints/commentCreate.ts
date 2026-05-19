import { OpenAPIRoute } from "chanfana";
import { isAllowedLikeId } from "../allowedLikeIds";
import { extractBearerToken } from "../auth";
import { hasRecentUserComment, insertComment, verifySupabaseUser } from "../supabase";
import { type AppContext, CommentCreateBody, CommentCreateResponse, createErrorResponse, ErrorResponse } from "../types";

export class CommentCreate extends OpenAPIRoute {
	schema = {
		tags: ["Comments"],
		summary: "Create a comment for one item",
		request: {
			body: {
				content: {
					"application/json": {
						schema: CommentCreateBody,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the saved comment",
				content: {
					"application/json": {
						schema: CommentCreateResponse,
					},
				},
			},
			"400": {
				description: "Invalid input",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
			"401": {
				description: "Missing or invalid Supabase access token",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
			"429": {
				description: "Too many repeated comments",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const itemId = data.body.itemId.trim().toLowerCase();
		const content = data.body.content.trim();

		if (!isAllowedLikeId(itemId)) {
			return c.json(createErrorResponse("Unknown itemId"), 400);
		}

		const accessToken = extractBearerToken(c.req.header("Authorization"));
		if (!accessToken) {
			return c.json(createErrorResponse("Sign in is required to comment"), 401);
		}

		try {
			const user = await verifySupabaseUser(c.env, accessToken);
			if (!user) {
				return c.json(createErrorResponse("Invalid or expired session"), 401);
			}

			const isRepeated = await hasRecentUserComment(c.env, user.id, itemId);
			if (isRepeated) {
				c.header("Retry-After", "10");
				return c.json(createErrorResponse("Please wait a few seconds before commenting again"), 429);
			}

			const comment = await insertComment(c.env, itemId, user, content);
			return c.json({
				success: true,
				comment,
			});
		} catch (error) {
			console.warn("Unable to create comment.", error);
			return c.json(createErrorResponse("Unable to save comment right now"), 503);
		}
	}
}
