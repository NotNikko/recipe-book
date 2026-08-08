import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const recipes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/recipes" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    prepTime: z.number(),
    cookTime: z.number(),
    servings: z.number(),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    featured: z.boolean().default(false),
    favorite: z.boolean().default(false),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string()),
  }),
});

export const collections = {
  recipes,
};
