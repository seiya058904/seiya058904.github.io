import { OpenAPIRoute } from "chanfana";
import { listLikes } from "../kv";
import { type AppContext } from "../types";

export class AdminLikesList extends OpenAPIRoute {
	schema = {
		tags: ["Admin"],
		summary: "List likes for admin table",
		responses: {
			"200": {
				description: "Returns all likes as an array",
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								success: { type: "boolean", const: true },
								items: {
									type: "array",
									items: {
										type: "object",
										properties: {
											itemId: { type: "string" },
											count: { type: "integer", minimum: 0 },
										},
										required: ["itemId", "count"],
									},
								},
							},
							required: ["success", "items"],
						},
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const likes = await listLikes(c.env.LIKES_KV);
		const items = Object.entries(likes).map(([itemId, count]) => ({
			itemId,
			count,
		}));

		return c.json({
			success: true,
			items,
		});
	}
}
