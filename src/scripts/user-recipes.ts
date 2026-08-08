export const STORAGE_KEY = "cookbook-user-recipes";
export const FAVORITES_KEY = "cookbook-favorites";

export interface UserRecipe {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  tags: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  featured: boolean;
  favorite: boolean;
  ingredients: string[];
  instructions: string[];
}

/** The subset of fields a recipe card needs — satisfied by both UserRecipe and the
 *  decrypted static Recipe type (src/scripts/site-auth.ts), so cards render identically
 *  either way. */
export interface CardData {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  prepTime: number;
  servings: number;
}

export function getAll(): UserRecipe[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

export function saveAll(recipes: UserRecipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function getById(id: string): UserRecipe | undefined {
  return getAll().find(r => r.id === id);
}

export function upsert(recipe: UserRecipe) {
  const all = getAll();
  const idx = all.findIndex(r => r.id === recipe.id);
  if (idx >= 0) all[idx] = recipe;
  else all.unshift(recipe);
  saveAll(all);
}

export function remove(id: string) {
  saveAll(getAll().filter(r => r.id !== id));
}

export function localHref(id: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${base}recipes/local?id=${id}`;
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function isFav(id: string): boolean {
  return (JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[]).includes(id);
}

/** Returns an HTML string for a recipe card (used across all recipe grids/listings). */
export function cardHTML(recipe: CardData, href: string): string {
  const fav = isFav(recipe.id);
  const diffColor = recipe.difficulty === "Easy"
    ? "bg-green-100 text-green-700"
    : recipe.difficulty === "Medium"
    ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-red-700";

  return `
<div class="rounded-3xl bg-[var(--color-surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
  <div class="relative">
    <a href="${href}" class="block">
      <div class="relative aspect-[4/3] w-full overflow-hidden rounded-t-3xl"
           style="background:linear-gradient(135deg,var(--color-primary),var(--color-accent))">
        ${recipe.image
          ? `<img src="${esc(recipe.image)}" alt="${esc(recipe.title)}" class="absolute inset-0 h-full w-full object-cover" onerror="this.style.display='none'">`
          : ""}
      </div>
      <div class="space-y-3 p-5">
        <h3 style="font-family:var(--font-heading);margin:0">${esc(recipe.title)}</h3>
        <p class="text-sm text-[var(--color-text-muted)]">${esc(recipe.description)}</p>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700">${esc(recipe.category)}</span>
          <span class="rounded-full px-3 py-1 text-sm ${diffColor}">${recipe.difficulty}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span>⏱ ${recipe.prepTime} min</span>
          <span>🍽 ${recipe.servings}</span>
        </div>
      </div>
    </a>
    <button
      class="favorite-btn absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition hover:scale-110"
      data-recipe-id="${esc(recipe.id)}"
      aria-label="Toggle favorite"
      style="background:rgba(255,255,255,.8)"
    >
      <span class="heart-icon">${fav ? "❤️" : "🤍"}</span>
    </button>
  </div>
</div>`;
}

function wireFavoriteButtons(container: HTMLElement) {
  container.querySelectorAll<HTMLButtonElement>(".favorite-btn").forEach(btn => {
    const id = btn.dataset.recipeId ?? "";
    btn.addEventListener("click", () => {
      const favs: string[] = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
      const isFaved = favs.includes(id);
      const updated = isFaved ? favs.filter(f => f !== id) : [...favs, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      btn.querySelector(".heart-icon")!.textContent = isFaved ? "🤍" : "❤️";
    });
  });
}

/** Appends cards for any card-shaped recipe list into `container`, given an href-builder. */
export function mountCardsGeneric<T extends CardData>(
  container: HTMLElement,
  recipes: T[],
  hrefFor: (recipe: T) => string,
) {
  recipes.forEach(recipe => {
    const wrap = document.createElement("div");
    wrap.innerHTML = cardHTML(recipe, hrefFor(recipe)).trim();
    container.appendChild(wrap.firstElementChild!);
  });
  wireFavoriteButtons(container);
}

/** Appends user (local) recipe cards to `container` and wires up heart buttons. */
export function mountCards(container: HTMLElement, recipes?: UserRecipe[]) {
  const list = recipes ?? getAll();
  if (list.length === 0) return;
  mountCardsGeneric(container, list, r => localHref(r.id));
}
