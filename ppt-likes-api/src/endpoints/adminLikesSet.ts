import { OpenAPIRoute } from "chanfana";
import { isAllowedLikeId } from "../allowedLikeIds";
import { AdminLikesBody, AdminLikesSetResponse, type AppContext, createErrorResponse, ErrorResponse } from "../types";

export class AdminLikesSet extends OpenAPIRoute {
	schema = {
		tags: ["Admin"],
		summary: "Set a like count for one item",
		request: {
			body: {
				content: {
					"application/json": {
						schema: AdminLikesBody,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the saved count",
				content: {
					"application/json": {
						schema: AdminLikesSetResponse,
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
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { itemId, count } = data.body;

		if (!isAllowedLikeId(itemId)) {
			return c.json(createErrorResponse("Unknown itemId"), 400);
		}

		await c.env.LIKES_KV.put(`likes:${itemId}`, String(count));

		return c.json({
			success: true,
			itemId,
			count,
		});
	}
}
