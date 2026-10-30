import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";
const root = document.querySelector(".atlas44");
if (root) {
  const owner = createOwnership();
  const desktop = matchMedia("(min-width:901px)");
  const links = [...root.querySelectorAll("[data-atlas-select]")];
  const panels = [...root.querySelectorAll("[data-atlas-family]")];
  let selected = panels[0].dataset.atlasFamily;
  const refresh = () => window.ScrollTrigger?.refresh();
  function render() {
    for (const panel of panels)
      panel.hidden = desktop.matches && panel.dataset.atlasFamily !== selected;
    for (const link of links) {
      if (desktop.matches && link.dataset.atlasSelect === selected)
        link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
    refresh();
  }
  function select(slug) {
    if (!panels.some((panel) => panel.dataset.atlasFamily === slug)) return;
    selected = slug;
    render();
  }
  owner.listen(root, "click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const family = event.target.closest("[data-atlas-select]");
    if (family && desktop.matches) {
      event.preventDefault();
      select(family.dataset.atlasSelect);
      root
        .querySelector(`[data-atlas-family="${selected}"]`)
        .focus({ preventScroll: true });
      document
        .querySelector("#atlas44-sheets")
        .scrollIntoView({ behavior: "instant", block: "start" });
    }
    const gallery = event.target.closest("[data-atlas-gallery]");
    if (gallery)
      document
        .querySelector(
          `.compact-gallery [data-gallery-family="${gallery.dataset.atlasGallery}"]`,
        )
        ?.click();
  });
  function restoreHash() {
    const panel = panels.find((item) => "#" + item.id === location.hash);
    if (panel) select(panel.dataset.atlasFamily);
  }
  owner.listen(window, "hashchange", restoreHash);
  owner.listen(desktop, "change", render);
  for (const details of root.querySelectorAll("details"))
    owner.listen(details, "toggle", refresh);
  owner.listen(window, "pagehide", (event) => {
    if (!event.persisted) owner.dispose();
  });
  render();
  restoreHash();
  root.dataset.enhanced = "true";
}
