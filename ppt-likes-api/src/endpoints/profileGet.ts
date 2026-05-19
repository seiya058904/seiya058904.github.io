import { OpenAPIRoute } from "chanfana";
import { extractBearerToken } from "../auth";
import { ensureUserProfile, isSupabaseConfigError, verifySupabaseUser } from "../supabase";
import { type AppContext, createErrorResponse, ErrorResponse, ProfileGetResponse } from "../types";

export class ProfileGet extends OpenAPIRoute {
	schema = {
		tags: ["Profile"],
		summary: "Get the signed-in user's public profile",
		responses: {
			"200": {
				description: "Returns the profile or null",
				content: {
					"application/json": {
						schema: ProfileGetResponse,
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
				description: "Supabase is not configured or unavailable",
				content: {
					"application/json": {
						schema: ErrorResponse,
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const accessToken = extractBearerToken(c.req.header("Authorization"));
		if (!accessToken) {
			return c.json(createErrorResponse("Sign in is required"), 401);
		}

		try {
			const user = await verifySupabaseUser(c.env, accessToken);
			if (!user) {
				return c.json(createErrorResponse("Invalid or expired session"), 401);
			}

			const profile = await ensureUserProfile(c.env, user.id);
			return c.json({
				success: true,
				profile,
			});
		} catch (error) {
			console.warn("Unable to load profile.", error);
			if (isSupabaseConfigError(error)) {
				return c.json(createErrorResponse(`${error instanceof Error ? error.message : "Supabase is not configured"}. Check local .dev.vars or Worker secrets.`), 503);
			}

			return c.json(createErrorResponse("Unable to load profile right now"), 503);
		}
	}
}
