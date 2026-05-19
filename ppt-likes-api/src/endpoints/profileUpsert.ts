import { OpenAPIRoute } from "chanfana";
import { extractBearerToken } from "../auth";
import { upsertUserProfile, verifySupabaseUser } from "../supabase";
import { type AppContext, createErrorResponse, ErrorResponse, ProfileUpsertBody, ProfileUpsertResponse } from "../types";

export class ProfileUpsert extends OpenAPIRoute {
	schema = {
		tags: ["Profile"],
		summary: "Create or update the signed-in user's public profile",
		request: {
			body: {
				content: {
					"application/json": {
						schema: ProfileUpsertBody,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the saved profile",
				content: {
					"application/json": {
						schema: ProfileUpsertResponse,
					},
				},
			},
			"400": {
				description: "Invalid display name",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
			"401": {
				description: "Missing or invalid Supabase access token",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
			"503": {
				description: "Profile service unavailable",
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
		const displayName = data.body.displayName.trim().replace(/\s+/g, " ");

		const accessToken = extractBearerToken(c.req.header("Authorization"));
		if (!accessToken) {
			return c.json(createErrorResponse("Sign in is required", "UNAUTHORIZED"), 401);
		}

		try {
			const user = await verifySupabaseUser(c.env, accessToken);
			if (!user) {
				return c.json(createErrorResponse("Invalid or expired session", "UNAUTHORIZED"), 401);
			}

			const profile = await upsertUserProfile(c.env, user.id, displayName);
			return c.json({
				success: true,
				profile,
			});
		} catch (error) {
			console.warn("Unable to save profile.", error);
			return c.json(createErrorResponse("Unable to save profile right now"), 503);
		}
	}
}
