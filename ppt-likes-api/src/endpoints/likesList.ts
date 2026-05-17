import { OpenAPIRoute } from "chanfana";
import { listLikes } from "../kv";
import { type AppContext, LikesResponse } from "../types";

export class LikesList extends OpenAPIRoute {
	schema = {
		tags: ["Likes"],
		summary: "Get public like counts for all items",
		responses: {
			"200": {
				description: "Returns all public like counts",
				content: {
					"application/json": {
						schema: LikesResponse,
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const likes = await listLikes(c.env.LIKES_KV);
		return {
			success: true as const,
			likes,
		};
	}
}
