import { mountGallery } from "/glamping-preview/cinematic/proof/controllers/gallery.mjs";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";
const owner = createOwnership();
let gallery;
const unmount = mountGallery(
  document.querySelector(".atlas-proof"),
  owner,
  (api) => {
    gallery = api;
  },
);
owner.listen(document, "click", async (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !gallery
  )
    return;
  const link = event.target.closest("[data-overview-image]");
  if (!link) return;
  event.preventDefault();
  await gallery.openSource(link.href, link);
});
const rows = [...document.querySelectorAll("[data-document], .contact-requisites")];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const states = rows.map((row) => ({
  row,
  summary: row.querySelector("summary"),
  content: row.querySelector(":scope > div"),
  expanded: row.open,
  name: row.getAttribute("name"),
  height: row.style.height,
  overflow: row.style.overflow,
  animation: undefined,
}));
const documentStates = states.filter((state) => state.row.hasAttribute("data-document"));
function currentDocument() {
  const output = document.querySelector("#active-document-code");
  output.hidden = false;
  output.textContent =
    documentStates.find((state) => state.expanded)?.row.dataset.document ??
    "АР / КР / ИР";
}
function settle(state) {
  state.animation?.cancel();
  state.animation = undefined;
  state.row.open = state.expanded;
  state.row.style.height = state.height;
  state.row.style.overflow = state.overflow;
  state.content.inert = false;
}
function expand(state, expanded) {
  if (state.expanded === expanded) return;
  const from = state.row.getBoundingClientRect().height;
  state.expanded = expanded;
  state.animation?.cancel();
  if (reduced.matches) return settle(state);
  state.row.style.height = `${from}px`;
  state.row.style.overflow = "hidden";
  state.row.open = true;
  state.content.inert = !expanded;
  const borders = state.row.offsetHeight - state.row.clientHeight;
  const to =
    state.summary.getBoundingClientRect().height +
    borders +
    (expanded ? state.content.getBoundingClientRect().height : 0);
  const animation = state.row.animate(
    [{ height: `${from}px` }, { height: `${to}px` }],
    { duration: 360, easing: "cubic-bezier(.22,.68,.22,1)" },
  );
  state.animation = animation;
  animation.finished
    .then(() => {
      if (state.animation === animation) settle(state);
    })
    .catch(() => {});
}
let anchorFrame = 0;
let previousAnchoring;
function stopAnchor() {
  cancelAnimationFrame(anchorFrame);
  anchorFrame = 0;
  if (previousAnchoring !== undefined) {
    document.documentElement.style.overflowAnchor = previousAnchoring;
    previousAnchoring = undefined;
  }
}
function anchorSummary(summary) {
  stopAnchor();
  const root = document.documentElement;
  previousAnchoring ??= root.style.overflowAnchor;
  root.style.overflowAnchor = "none";
  let previousTop = summary.getBoundingClientRect().top + scrollY;
  // Compensate only structural movement above the clicked heading; wheel input stays native.
  function keepAnchor() {
    const top = summary.getBoundingClientRect().top + scrollY;
    const delta = top - previousTop;
    const before = scrollY;
    if (Math.abs(delta) > 0.1) scrollBy({ top: delta, behavior: "instant" });
    previousTop = top - (delta - (scrollY - before));
    if (states.some((state) => state.animation)) {
      anchorFrame = requestAnimationFrame(keepAnchor);
    } else {
      root.style.overflowAnchor = previousAnchoring;
      previousAnchoring = undefined;
      anchorFrame = 0;
    }
  }
  return keepAnchor;
}
states.forEach((state) => {
  // The native name group would hide a closing row before its animation finishes.
  state.row.removeAttribute("name");
  owner.listen(state.summary, "click", (event) => {
    event.preventDefault();
    const keepAnchor = anchorSummary(state.summary);
    const expanded = !state.expanded;
    const group = documentStates.includes(state) ? documentStates : [state];
    group.forEach((item) => expand(item, item === state && expanded));
    currentDocument();
    keepAnchor();
  });
});
currentDocument();
function settleLayout() {
  // Full motion/viewport remounts own their new geometry, not the old click anchor.
  stopAnchor();
  states.forEach(settle);
}
owner.listen(window, "resize", settleLayout);
owner.listen(reduced, "change", settleLayout);
owner.cleanup(() => {
  stopAnchor();
  states.forEach((state) => {
    settle(state);
    if (state.name !== null) state.row.setAttribute("name", state.name);
  });
});
owner.listen(window, "pagehide", (event) => {
  if (event.persisted) return;
  unmount?.();
  owner.dispose();
});
