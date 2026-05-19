import { OpenAPIRoute } from "chanfana";
import { extractBearerToken } from "../auth";
import { isSupabaseConfigError, upsertUserProfile, validateDisplayName, verifySupabaseUser } from "../supabase";
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
		const data = await this.getValidatedData<typeof this.schema>();
		const validation = validateDisplayName(data.body.displayName);
		if (!validation.valid) {
			return c.json(createErrorResponse(validation.error, "INVALID_DISPLAY_NAME"), 400);
		}

		const accessToken = extractBearerToken(c.req.header("Authorization"));
		if (!accessToken) {
			return c.json(createErrorResponse("Sign in is required", "UNAUTHORIZED"), 401);
		}

		try {
			const user = await verifySupabaseUser(c.env, accessToken);
			if (!user) {
				return c.json(createErrorResponse("Invalid or expired session", "UNAUTHORIZED"), 401);
			}

			const profile = await upsertUserProfile(c.env, user.id, validation.value);
			return c.json({
				success: true,
				profile,
			});
		} catch (error) {
			console.warn("Unable to save profile.", error);
			if (isSupabaseConfigError(error)) {
				return c.json(createErrorResponse(`${error instanceof Error ? error.message : "Supabase is not configured"}. Check local .dev.vars or Worker secrets.`), 503);
			}

			return c.json(createErrorResponse("Unable to save profile right now"), 503);
		}
	}
}
