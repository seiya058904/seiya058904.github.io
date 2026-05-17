import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, ErrorResponse, likeIdPattern } from "../types";

const AdminResetBody = z.object({
	itemId: z.string().regex(likeIdPattern),
});

export class AdminLikesReset extends OpenAPIRoute {
	schema = {
		tags: ["Admin"],
		summary: "Reset a like count to zero",
		request: {
			body: {
				content: {
					"application/json": {
						schema: AdminResetBody,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the reset count",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(true),
							itemId: z.string(),
							count: z.literal(0),
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
		const { itemId } = data.body;

		await c.env.LIKES_KV.put(`likes:${itemId}`, "0");

		return c.json({
			success: true,
			itemId,
			count: 0 as const,
		});
	}
}
