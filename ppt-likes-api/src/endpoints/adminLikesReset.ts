import { OpenAPIRoute } from "chanfana";
import { isAllowedLikeId } from "../allowedLikeIds";
import { AdminLikesBody, AdminLikesResetResponse, type AppContext, createErrorResponse, ErrorResponse } from "../types";

export class AdminLikesReset extends OpenAPIRoute {
	schema = {
		tags: ["Admin"],
		summary: "Reset a like count to zero",
		request: {
			body: {
				content: {
					"application/json": {
						schema: AdminLikesBody.pick({ itemId: true }),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the reset count",
				content: {
					"application/json": {
						schema: AdminLikesResetResponse,
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
		const { itemId } = data.body;

		if (!isAllowedLikeId(itemId)) {
			return c.json(createErrorResponse("Unknown itemId"), 400);
		}

		await c.env.LIKES_KV.put(`likes:${itemId}`, "0");

		return c.json({
			success: true,
			itemId,
			count: 0 as const,
		});
	}
}
