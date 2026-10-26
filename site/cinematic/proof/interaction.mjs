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
function currentDocument() {
  const output = document.querySelector("#active-document-code");
  output.hidden = false;
  output.textContent =
    rows.find((row) => row.open)?.dataset.document ?? "АР / КР / ИР";
}
rows.forEach((row) => owner.listen(row, "toggle", currentDocument));
currentDocument();
owner.listen(window, "pagehide", (event) => {
  if (event.persisted) return;
  unmount?.();
  owner.dispose();
});
