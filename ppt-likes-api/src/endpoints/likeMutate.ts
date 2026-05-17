import { OpenAPIRoute } from "chanfana";
import { mutateLikeCount } from "../kv";
import { type AppContext, LikeMutationBody, LikeMutationResponse } from "../types";

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
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { itemId, action } = data.body;
		const count = await mutateLikeCount(c.env.LIKES_KV, itemId, action);

		return c.json({
			success: true,
			itemId,
			count,
		});
	}
}
