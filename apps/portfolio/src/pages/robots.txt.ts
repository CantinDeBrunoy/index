import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? `Sitemap: ${new URL("sitemap-index.xml", site).href}\n` : "";
  // Les fiches seules (pages/fiches) ne sont que des morceaux du voyage : leurs pages complètes sont les fiches.
  return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /fiches/\nDisallow: /en/fiches/\n${sitemap}`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
