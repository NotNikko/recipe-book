import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { deriveKey, encryptJSON } from "../lib/site-crypto";

// Replaces the old search-index.json.ts. Ships ONLY ciphertext — recipe content
// (titles, descriptions, ingredients, instructions, everything) is encrypted at
// build time and never appears in plaintext anywhere in the built output. It's
// decrypted client-side, after the password gate succeeds (see src/scripts/site-auth.ts).
export const GET: APIRoute = async () => {
  const recipes = await getCollection("recipes");

  const bundle = {
    recipes: recipes.map(r => ({
      id: r.id.replace(/\.md$/, ""),
      title: r.data.title,
      description: r.data.description,
      image: r.data.image,
      category: r.data.category,
      tags: r.data.tags,
      prepTime: r.data.prepTime,
      cookTime: r.data.cookTime,
      servings: r.data.servings,
      difficulty: r.data.difficulty,
      featured: r.data.featured,
      ingredients: r.data.ingredients,
      instructions: r.data.instructions,
      body: r.body ?? "",
    })),
  };

  const password = import.meta.env.PUBLIC_MANAGE_PASSWORD ?? "";
  const key = await deriveKey(password);
  const payload = await encryptJSON(bundle, key);

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });
};
