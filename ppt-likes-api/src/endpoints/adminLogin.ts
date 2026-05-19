import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { createAdminToken } from "../auth";
import { AdminLoginResponse, type AppContext, createErrorResponse, ErrorResponse } from "../types";

const AdminLoginBody = z.object({
	password: z.string().min(1),
});

export class AdminLogin extends OpenAPIRoute {
	schema = {
		tags: ["Admin"],
		summary: "Login to likes dashboard",
		request: {
			body: {
				content: {
					"application/json": {
						schema: AdminLoginBody,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns a signed admin token",
				content: {
					"application/json": {
						schema: AdminLoginResponse,
					},
				},
			},
			"401": {
				description: "Invalid admin password",
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
		const password = data.body.password.trim();
		const hasRequiredSecrets = Boolean(c.env.ADMIN_PASSWORD && c.env.ADMIN_TOKEN_SECRET);

		if (!hasRequiredSecrets) {
			return c.json(createErrorResponse("Admin login is not configured"), 503);
		}

		if (password !== c.env.ADMIN_PASSWORD) {
			return c.json(createErrorResponse("Invalid password"), 401);
		}

		const { token, expiresAt } = await createAdminToken(c.env.ADMIN_TOKEN_SECRET);
		return c.json({
			success: true,
			token,
			expiresAt,
		});
	}
}
