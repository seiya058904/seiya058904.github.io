import { fromHono } from "chanfana";
import { Hono } from "hono";
import { extractBearerToken, verifyAdminToken } from "./auth";
import { getCorsOptions } from "./cors";
import { CommentCreate } from "./endpoints/commentCreate";
import { CommentsList } from "./endpoints/commentsList";
import { AdminLikesList } from "./endpoints/adminLikesList";
import { AdminLikesReset } from "./endpoints/adminLikesReset";
import { AdminLikesSet } from "./endpoints/adminLikesSet";
import { AdminLogin } from "./endpoints/adminLogin";
import { LikeMutate } from "./endpoints/likeMutate";
import { LikesList } from "./endpoints/likesList";
import { ProfileGet } from "./endpoints/profileGet";
import { ProfileUpsert } from "./endpoints/profileUpsert";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
	const origin = c.req.header("Origin");
	const cors = getCorsOptions(origin, c.env);

	if (!cors.allowed) {
		const response = c.json(
			{
				success: false,
				error: "Origin not allowed",
			},
			403,
		);
		cors.headers.forEach((value, key) => {
			response.headers.set(key, value);
		});
		return response;
	}

	if (c.req.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: cors.headers,
		});
	}

	await next();

	cors.headers.forEach((value, key) => {
		c.res.headers.set(key, value);
	});
});

app.use("/api/admin/*", async (c, next) => {
	if (c.req.path === "/api/admin/login") {
		await next();
		return;
	}

	const token = extractBearerToken(c.req.header("Authorization"));
	const isValid = await verifyAdminToken(token ?? undefined, c.env.ADMIN_TOKEN_SECRET);

	if (!isValid) {
		return c.json(
			{
				success: false,
				error: "Unauthorized",
			},
			401,
		);
	}

	await next();
});

// Health check endpoint (before OpenAPI to avoid docs registration)
app.get("/api/health", (c) => {
	return c.json({
		status: "ok",
		env: c.env.ENVIRONMENT || "development",
	});
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// Register OpenAPI endpoints
openapi.get("/api/likes", LikesList);
openapi.post("/api/like", LikeMutate);
openapi.get("/api/comments", CommentsList);
openapi.post("/api/comments", CommentCreate);
openapi.get("/api/profile", ProfileGet);
openapi.post("/api/profile", ProfileUpsert);
openapi.post("/api/admin/login", AdminLogin);
openapi.get("/api/admin/likes", AdminLikesList);
openapi.post("/api/admin/likes/set", AdminLikesSet);
openapi.post("/api/admin/likes/reset", AdminLikesReset);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;
