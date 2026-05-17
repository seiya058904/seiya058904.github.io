import { fromHono } from "chanfana";
import { Hono } from "hono";
import { getCorsOptions } from "./cors";
import { LikeMutate } from "./endpoints/likeMutate";
import { LikesList } from "./endpoints/likesList";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
	const origin = c.req.header("Origin");
	const cors = getCorsOptions(origin, c.env);

	if (!cors.allowed) {
		return c.json(
			{
				success: false,
				error: "Origin not allowed",
			},
			403,
			cors.headers,
		);
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

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// Register OpenAPI endpoints
openapi.get("/api/likes", LikesList);
openapi.post("/api/like", LikeMutate);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;
