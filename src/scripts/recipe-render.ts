// Shared recipe-detail hydration helpers — rendering ingredients/instructions/cooking
// mode into a DOM shell at runtime. Used by both the static recipe detail page
// (recipes/[id].astro, populated from the decrypted data.enc.json bundle) and the
// local recipe detail page (recipes/local.astro, populated from localStorage) —
// they need identical behavior, so it lives in one place instead of two.

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Renders the ingredient checklist into `list`, wiring up click-to-check-off. */
export function renderIngredients(list: HTMLElement, ingredients: string[]) {
  list.innerHTML = "";
  ingredients.forEach(ing => {
    const li = document.createElement("li");
    li.className = "ing-item flex cursor-pointer items-start gap-3 transition-opacity";
    li.innerHTML = `
      <button class="ing-check mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] transition" aria-label="Check off ${escapeHtml(ing)}">
        <span class="check-mark hidden text-white" style="font-size:10px">✓</span>
      </button>
      <span class="ing-text leading-relaxed">${escapeHtml(ing)}</span>
    `;
    const btn = li.querySelector<HTMLButtonElement>(".ing-check")!;
    btn.addEventListener("click", () => {
      const on = btn.classList.toggle("checked");
      li.classList.toggle("opacity-40", on);
      li.querySelector(".ing-text")!.classList.toggle("line-through", on);
      li.querySelector<HTMLSpanElement>(".check-mark")!.classList.toggle("hidden", !on);
    });
    list.appendChild(li);
  });
}

/** Renders numbered instruction steps into `list`. */
export function renderInstructions(list: HTMLElement, instructions: string[]) {
  list.innerHTML = "";
  instructions.forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "flex gap-5";
    li.innerHTML = `
      <span class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">${i + 1}</span>
      <p class="leading-relaxed">${escapeHtml(step)}</p>
    `;
    list.appendChild(li);
  });
}

export interface CookingModeElements {
  trigger: HTMLElement;
  overlay: HTMLElement;
  exit: HTMLElement;
  recipeTitle: HTMLElement;
  counter: HTMLElement;
  label: HTMLElement;
  text: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLElement;
  dots: HTMLElement;
  timerWrap: HTMLElement;
  timerBtn: HTMLElement;
  timerLabel: HTMLElement;
  timerDisp: HTMLElement;
}

function extractMinutes(text: string): number | null {
  const m = text.match(/(\d+)(?:\s+to\s+(\d+))?\s+minutes?/i);
  return m ? (m[2] ? parseInt(m[2]) : parseInt(m[1])) : null;
}

/** Wires up a cooking-mode overlay (trigger button + full-screen step-through UI). */
export function initCookingMode(el: CookingModeElements, title: string, instructions: string[]) {
  const steps = instructions.map(text => ({ text, mins: extractMinutes(text) }));
  el.recipeTitle.textContent = title;

  let step = 0;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let timerRunning = false;
  let wakeLock: WakeLockSentinel | null = null;

  steps.forEach(() => {
    const dot = document.createElement("div");
    dot.style.cssText = "width:8px;height:8px;border-radius:50%;transition:background .2s;";
    el.dots.appendChild(dot);
  });

  function clearTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    timerRunning = false;
    el.timerDisp.classList.add("hidden");
    if (steps[step]?.mins) el.timerLabel.textContent = `Set ${steps[step].mins} min timer`;
  }

  function render() {
    const s = steps[step];
    el.counter.textContent = `Step ${step + 1} of ${steps.length}`;
    el.label.textContent   = `Step ${step + 1}`;
    el.text.textContent    = s.text;
    el.prev.disabled       = step === 0;
    el.next.textContent    = step === steps.length - 1 ? "Finish ✓" : "Next →";
    clearTimer();
    if (s.mins) { el.timerWrap.style.display = "flex"; el.timerLabel.textContent = `Set ${s.mins} min timer`; }
    else el.timerWrap.style.display = "none";
    Array.from(el.dots.children).forEach((d, i) => {
      (d as HTMLElement).style.background = i === step ? "var(--color-primary)" : "var(--color-border)";
    });
  }

  async function open() {
    step = 0;
    el.overlay.style.display = "flex";
    render();
    document.body.style.overflow = "hidden";
    if ("wakeLock" in navigator) {
      try { wakeLock = await (navigator as any).wakeLock.request("screen"); } catch {}
    }
  }

  function close() {
    el.overlay.style.display = "";
    clearTimer();
    document.body.style.overflow = "";
    if (wakeLock) { wakeLock.release(); wakeLock = null; }
  }

  el.trigger.addEventListener("click", open);
  el.exit.addEventListener("click", close);
  el.prev.addEventListener("click", () => { if (step > 0) { step--; render(); } });
  el.next.addEventListener("click", () => {
    if (step < steps.length - 1) { step++; render(); } else close();
  });
  el.timerBtn.addEventListener("click", () => {
    const mins = steps[step].mins;
    if (!mins) return;
    if (timerRunning) { clearTimer(); return; }
    let remaining = mins * 60;
    timerRunning = true;
    el.timerLabel.textContent = "Cancel timer";
    el.timerDisp.classList.remove("hidden");
    const tick = () => {
      const m = Math.floor(remaining / 60), s = remaining % 60;
      el.timerDisp.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      if (remaining-- <= 0) {
        clearInterval(timerInterval!);
        el.timerDisp.textContent = "Done! 🎉";
        el.timerLabel.textContent = `Set ${mins} min timer`;
        timerRunning = false;
      }
    };
    tick();
    timerInterval = setInterval(tick, 1000);
  });
  document.addEventListener("keydown", e => {
    if (el.overlay.style.display !== "flex") return;
    if (e.key === "ArrowRight" && step < steps.length - 1) { step++; render(); }
    if (e.key === "ArrowLeft"  && step > 0)                { step--; render(); }
    if (e.key === "Escape") close();
  });
}
