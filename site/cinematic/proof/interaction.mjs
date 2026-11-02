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
const rows = [...document.querySelectorAll("[data-document]")];
const documentRows = document.querySelector(".document-rows");
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
function currentDocument() {
  const output = document.querySelector("#active-document-code");
  output.hidden = false;
  output.textContent =
    states.find((state) => state.expanded)?.row.dataset.document ??
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
// Reserve the largest single panel so changing rows cannot clamp bottom-of-page scroll.
const originalMinHeight = documentRows.style.minHeight;
let measuredWidth = 0;
function reserveDocumentHeight() {
  if (!owner.alive) return;
  states.forEach(settle);
  const width = documentRows.getBoundingClientRect().width;
  measuredWidth = width;
  const measure = documentRows.cloneNode(true);
  measure.inert = true;
  measure.setAttribute("aria-hidden", "true");
  Object.assign(measure.style, {
    position: "absolute",
    top: "0",
    left: "0",
    visibility: "hidden",
    pointerEvents: "none",
    width: `${width}px`,
    minHeight: "0",
    height: "auto",
  });
  [...measure.children].forEach((row) => {
    row.removeAttribute("name");
    row.open = true;
  });
  documentRows.after(measure);
  let summaries = 0;
  let tallest = 0;
  [...measure.children].forEach((row) => {
    const contentHeight = row
      .querySelector(":scope > div")
      .getBoundingClientRect().height;
    summaries += row.getBoundingClientRect().height - contentHeight;
    tallest = Math.max(tallest, contentHeight);
  });
  measure.remove();
  documentRows.style.minHeight = `${Math.ceil(summaries + tallest)}px`;
}
states.forEach((state) => {
  // The native name group would hide a closing row before its animation finishes.
  state.row.removeAttribute("name");
  owner.listen(state.summary, "click", (event) => {
    event.preventDefault();
    const expanded = !state.expanded;
    states.forEach((item) => expand(item, item === state && expanded));
    currentDocument();
  });
});
currentDocument();
reserveDocumentHeight();
const documentResize = new ResizeObserver(([entry]) => {
  if (Math.abs(entry.contentRect.width - measuredWidth) > 0.5)
    reserveDocumentHeight();
});
documentResize.observe(documentRows);
document.fonts.ready.then(reserveDocumentHeight);
owner.listen(reduced, "change", () => states.forEach(settle));
owner.cleanup(() => {
  documentResize.disconnect();
  states.forEach((state) => {
    settle(state);
    if (state.name !== null) state.row.setAttribute("name", state.name);
  });
  documentRows.style.minHeight = originalMinHeight;
});
owner.listen(window, "pagehide", (event) => {
  if (event.persisted) return;
  unmount?.();
  owner.dispose();
});
