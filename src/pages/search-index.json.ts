import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const recipes = await getCollection("recipes");
  const index = recipes.map(r => ({
    id: r.id.replace(/\.md$/, ""),
    title: r.data.title,
    description: r.data.description,
    category: r.data.category,
    tags: r.data.tags,
  }));
  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json" },
  });
};
