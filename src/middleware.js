import { defineMiddleware } from "astro:middleware";

const robotsPolicy = "noindex, nofollow, noarchive, nosnippet";

export const onRequest = defineMiddleware(async (_, next) => {
  const response = await next();
  response.headers.set("X-Robots-Tag", robotsPolicy);
  return response;
});
