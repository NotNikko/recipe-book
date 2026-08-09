---
name: creating-recipes
description: Use when the user wants to add, create, or write a new recipe for this cookbook site.
---

# Creating Recipes

## Overview

Gathers recipe details from the user one question at a time, drafts a recipe file matching this project's content schema (`src/content.config.ts`), and gets explicit approval before writing it into `src/content/recipes/`.

## Conversational gathering

**Ask questions one at a time.** After each answer, acknowledge it briefly and move to the next missing field. Do not dump all questions at once.

Order of questions — skip any the user already provided:

1. Recipe name/title
2. Short description (1–2 sentences about what it is and what makes it special)
3. Category (e.g. Baking, Dinner, Dessert, Breakfast, Snack, Soup)
4. Ingredients (full list with quantities — rough notes are fine, you'll clean them up)
5. Instructions (steps — rough notes are fine, you'll rewrite into full sentences)
6. Preheat/oven temperature (ask only if the recipe seems oven-based; skip if clearly stovetop/no-bake)
7. Prep time and cook time (minutes)
8. Servings (how many people does it serve?)
9. Difficulty (Easy / Medium / Hard)
10. Tags (optional — press Enter to skip)
11. Image URL (optional — press Enter to skip)

**Tone:** Be warm and conversational. Example:

> "Got it — Lemon Pasta. What category fits best? (e.g. Dinner, Baking, Snack…)"

> "Nice! Got the ingredients. Any oven time, or is this all stovetop?"

After the last answer, say something like "Great, I have everything I need — let me draft this up!"

## Workflow

1. Gather answers above (one at a time).
2. Generate a slug from the title: lowercase, strip non-alphanumeric characters, collapse whitespace to hyphens (same logic as `toSlug()` in `netlify/functions/publish-recipe.mjs`).
3. Rewrite the raw ingredients/instructions into clean prose — full sentences for instructions, in the tone of `src/content/recipes/chocolate-chip-cookies.md` (specific temps, techniques, ordering). The schema has no separate oven-temp field, so fold a given preheat temperature into the first instruction step.
4. Build frontmatter matching the schema exactly: `title`, `description`, `image`, `category`, `tags`, `prepTime`, `cookTime`, `servings`, `difficulty`, `featured: false`, `favorite: false`, `ingredients`, `instructions`.
5. Show the user the complete drafted `.md` file in a fenced code block. Ask them to approve or request edits. **Do not write the file until they approve.**
6. On approval, check `src/content/recipes/<slug>.md` doesn't already exist (ask the user how to disambiguate if it does), then write it with the Write tool.
7. Confirm creation and remind the user this is a permanent content-collection recipe (distinct from a local draft made via `/manage`).

## Schema reference

| Field | Type | Notes |
|---|---|---|
| title | string | |
| description | string | 1–2 sentences |
| image | string | URL, or `""` if none |
| category | string | |
| tags | string[] | `[]` if none |
| prepTime, cookTime | number | minutes |
| servings | number | |
| difficulty | "Easy"\|"Medium"\|"Hard" | |
| featured, favorite | boolean | always `false` for new recipes |
| ingredients | string[] | one per line, with quantity |
| instructions | string[] | full sentences, one step per line |

## Common mistakes

- Asking all questions at once instead of one at a time.
- Writing the file before the user approves the draft.
- Skipping the slug-collision check and silently overwriting an existing recipe.
- Leaving instructions as raw shorthand instead of polishing to full sentences.
- Omitting `featured: false` / `favorite: false` — required by the schema.
- Asking about oven temperature for obviously stovetop recipes.
