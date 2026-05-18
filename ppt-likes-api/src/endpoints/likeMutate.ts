import { OpenAPIRoute } from "chanfana";
import { isAllowedLikeId } from "../allowedLikeIds";
import { mutateLikeCount } from "../kv";
import { assertLikeRateLimit, getClientIp } from "../rateLimit";
import { type AppContext, createErrorResponse, ErrorResponse, LikeMutationBody, LikeMutationResponse } from "../types";

export class LikeMutate extends OpenAPIRoute {
	schema = {
		tags: ["Likes"],
		summary: "Like or unlike an item",
		request: {
			body: {
				content: {
					"application/json": {
						schema: LikeMutationBody,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the updated like count",
				content: {
					"application/json": {
						schema: LikeMutationResponse,
					},
				},
			},
			"400": {
				description: "Unknown like item id",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
			"429": {
				description: "Too many requests for the same item",
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
		const { itemId, action } = data.body;

		if (!isAllowedLikeId(itemId)) {
			return c.json(createErrorResponse("Unknown itemId"), 400);
		}

		const ip = getClientIp(c.req.raw);
		if (!ip) {
			return c.json(createErrorResponse("Unable to determine client IP"), 400);
		}

		const rateLimit = await assertLikeRateLimit(c.env.LIKES_KV, ip, itemId);
		if (!rateLimit.allowed) {
			c.header("Retry-After", String(rateLimit.retryAfterSeconds));
			return c.json(createErrorResponse("Too many requests for this item. Please try again shortly."), 429);
		}

		const count = await mutateLikeCount(c.env.LIKES_KV, itemId, action);

		return c.json({
			success: true,
			itemId,
			count,
		});
	}
}
