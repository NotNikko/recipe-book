function yamlStr(s) {
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function toSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "recipe";
}

function toMarkdown(recipe) {
  const arr = (items) =>
    !items || items.length === 0
      ? " []"
      : "\n" + items.map((i) => `  - ${yamlStr(i)}`).join("\n");

  return [
    "---",
    `title: ${yamlStr(recipe.title)}`,
    `description: ${yamlStr(recipe.description)}`,
    `image: ${yamlStr(recipe.image ?? "")}`,
    `category: ${yamlStr(recipe.category)}`,
    `tags:${arr(recipe.tags)}`,
    `prepTime: ${recipe.prepTime}`,
    `cookTime: ${recipe.cookTime}`,
    `servings: ${recipe.servings}`,
    `difficulty: ${recipe.difficulty}`,
    "featured: false",
    "favorite: false",
    `ingredients:${arr(recipe.ingredients)}`,
    `instructions:${arr(recipe.instructions)}`,
    "---",
    "",
  ].join("\n");
}

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO; // e.g. "NotNikko/recipe-book"

  if (!token || !repo) {
    return Response.json(
      { message: "Server not configured — set GITHUB_TOKEN and GITHUB_REPO in your Netlify environment variables." },
      { status: 500 }
    );
  }

  let recipe;
  try {
    recipe = await req.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }

  const slug   = toSlug(recipe.title);
  const path   = `src/content/recipes/${slug}.md`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Get the existing file's SHA if it exists (required to overwrite)
  let sha;
  try {
    const check = await fetch(apiUrl, { headers });
    if (check.ok) sha = (await check.json()).sha;
  } catch {}

  const content = Buffer.from(toMarkdown(recipe), "utf8").toString("base64");
  const body = {
    message: sha ? `Update recipe: ${recipe.title}` : `Add recipe: ${recipe.title}`,
    content,
    branch: "main",
    ...(sha ? { sha } : {}),
  };

  const resp = await fetch(apiUrl, { method: "PUT", headers, body: JSON.stringify(body) });
  const data = await resp.json().catch(() => ({}));

  return Response.json(data, { status: resp.status });
};

export const config = { path: "/api/publish-recipe" };
