import { auth } from "@repo/auth";
import { Hono } from "hono";

export const authRouter = new Hono()
	.all("/auth/*", (c) => {
		return auth.handler(c.req.raw);
	})
	.all("/auth/**", (c) => {
		return auth.handler(c.req.raw);
	});
