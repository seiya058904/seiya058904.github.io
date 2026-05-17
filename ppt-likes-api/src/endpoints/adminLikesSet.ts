import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, ErrorResponse, likeIdPattern } from "../types";

const AdminSetBody = z.object({
	itemId: z.string().regex(likeIdPattern),
	count: z.number().int().min(0).max(999999),
});

export class AdminLikesSet extends OpenAPIRoute {
	schema = {
		tags: ["Admin"],
		summary: "Set a like count for one item",
		request: {
			body: {
				content: {
					"application/json": {
						schema: AdminSetBody,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the saved count",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(true),
							itemId: z.string(),
							count: z.number().int().nonnegative(),
						}),
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

		await c.env.LIKES_KV.put(`likes:${itemId}`, String(count));

		return c.json({
			success: true,
			itemId,
			count,
		});
	}
}
