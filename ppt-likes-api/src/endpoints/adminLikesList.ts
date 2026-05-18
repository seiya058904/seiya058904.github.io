import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";
import { listLikes } from "../kv";

const AdminLikesListResponse = z.object({
	success: z.literal(true),
	items: z.array(
		z.object({
			itemId: z.string(),
			count: z.number().int().nonnegative(),
		}),
	),
});

export class AdminLikesList extends OpenAPIRoute {
	schema = {
		tags: ["Admin"],
		summary: "List likes for admin table",
		responses: {
			"200": {
				description: "Returns all likes as an array",
				content: {
					"application/json": {
						schema: AdminLikesListResponse,
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
