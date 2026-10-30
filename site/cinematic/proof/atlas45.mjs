import { gsap } from "gsap";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";

function mountAtlas() {
  const root = document.querySelector(".atlas45");
  const dialog = root?.querySelector("#atlas45-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const owner = createOwnership();
  const links = [...root.querySelectorAll("[data-atlas-select]")];
  const sources = [...root.querySelectorAll(".atlas45-references [data-atlas-detail]")];
  const content = dialog.querySelector("[data-atlas-content]");
  const title = dialog.querySelector("#atlas45-detail-title");
  const surface = dialog.querySelector(".atlas45-surface");
  const scrim = dialog.querySelector(".atlas45-scrim");
  const image = dialog.querySelector("[data-atlas-image]");
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  let opener;
  let state = "closed";
  let scrollLock;
  let motion;
  let request = 0;
  let decodedImage;
  const variant = new URL(location.href).searchParams.get("typography");
  root.dataset.typography = variant === "b" ? "b" : "a";
  root.dataset.dossier = new URL(location.href).searchParams.get("dossier") === "b" ? "b" : "a";
  root.dataset.atlasComposition = new URL(location.href).searchParams.get("atlas") === "b" ? "b" : "a";

  function setState(value) {
    state = value;
    dialog.dataset.state = value;
  }
  function stopMotion() {
    motion?.kill(false);
    motion = undefined;
  }
  function revealItems() {
    return [...dialog.querySelectorAll(".atlas45-dialog-head > div, [data-atlas-content] > .atlas45-detail > *")];
  }
  function clearVisuals() {
    gsap.set([surface, scrim, ...revealItems()], { clearProps: "opacity,transform,clipPath" });
  }
  function unlock() {
    if (!scrollLock) return;
    const html = document.documentElement;
    html.style.overflow = scrollLock.overflow;
    html.style.paddingRight = scrollLock.padding;
    scrollLock = undefined;
  }
  function finishClose(restoreFocus = true) {
    request++;
    decodedImage = undefined;
    stopMotion();
    // Remove the top layer before clearing opacity; no full-panel flash on close.
    setState("closed");
    if (dialog.open) dialog.close();
    clearVisuals();
    delete root.dataset.detail;
    unlock();
    if (restoreFocus) opener?.focus({ preventScroll: true });
  }
  function settleOpen() {
    stopMotion();
    clearVisuals();
    setState("open");
    if (decodedImage) image.src = decodedImage;
  }
  function close(restoreFocus = true) {
    if (state === "closed" || state === "closing") return;
    if (state === "preparing" || reduced.matches) return finishClose(restoreFocus);
    stopMotion();
    setState("closing");
    const duration = innerWidth <= 900 ? 0.36 : 0.42;
    motion = gsap.context(() => {
      gsap.timeline({ onComplete: () => finishClose(restoreFocus) })
        .to(revealItems(), { opacity: 0, y: 6, duration: 0.13, ease: "power2.in" }, 0)
        .to(surface, { opacity: 0, y: 10, clipPath: "inset(3% 0% 3% 0%)", duration: duration - 0.04, ease: "power2.inOut" }, 0.04)
        .to(scrim, { opacity: 0, duration: duration - 0.04, ease: "power2.inOut" }, 0.04);
    }, root);
  }
  async function open(family, source) {
    if (state !== "closed") {
      if (opener === family && state !== "closing") return;
      finishClose(false);
    }
    opener = family;
    const token = ++request;
    setState("preparing");
    content.replaceChildren(source.cloneNode(true));
    title.textContent = source.dataset.familyName;
    const card = family.querySelector("img");
    // The decoded card is the stable poster; sharpen only after the plane settles.
    image.src = card.currentSrc || card.src;
    image.alt = card.alt;
    image.width = Number(card.getAttribute("width"));
    image.height = Number(card.getAttribute("height"));
    await Promise.all([image, ...content.querySelectorAll(".dossier47-art img")].map((picture) => { picture.loading = "eager"; return picture.decode().catch(() => { picture.dataset.failed = "true"; }); }));
    if (!owner.alive || token !== request) return;
    const large = { amba: 1295, dyo: 1312, khamoran: 1156, chum: 1254 }[family.dataset.atlasSelect];
    const candidate = new Image();
    candidate.src = card.src.replace("-640.webp", `-${large}.webp`);
    candidate.decode().then(() => {
      if (!owner.alive || token !== request) return;
      decodedImage = candidate.src;
      if (state === "open") image.src = decodedImage;
    }).catch(() => {});
    const html = document.documentElement;
    scrollLock = { overflow: html.style.overflow, padding: html.style.paddingRight };
    const widthBeforeLock = html.getBoundingClientRect().width;
    const padding = parseFloat(getComputedStyle(html).paddingRight);
    html.style.overflow = "hidden";
    // Keep existing gutter policy: toggling it changes vw units on classic scrollbars.
    const lostGutter = html.getBoundingClientRect().width - widthBeforeLock;
    if (lostGutter > 0) html.style.paddingRight = `${padding + lostGutter}px`;
    root.dataset.detail = source.dataset.atlasDetail;
    setState("opening");
    if (!reduced.matches) {
      gsap.set(scrim, { opacity: 0 });
      gsap.set(surface, { opacity: 0, y: innerWidth <= 900 ? 12 : 10, clipPath: "inset(4% 0% 4% 0%)" });
      gsap.set(revealItems(), { opacity: 0, y: 8 });
    }
    dialog.showModal();
    surface.scrollTop = 0;
    dialog.querySelector("[data-atlas-close]").focus({ preventScroll: true });
    if (reduced.matches) return settleOpen();
    const duration = innerWidth <= 900 ? 0.5 : 0.6;
    motion = gsap.context(() => {
      gsap.timeline({ onComplete: settleOpen })
        .to(scrim, { opacity: 1, duration: duration * 0.85, ease: "power2.out" }, 0)
        .to(surface, { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)", duration, ease: "power2.out" }, 0)
        .to(revealItems(), { opacity: 1, y: 0, duration: 0.26, stagger: 0.035, ease: "power2.out" }, duration - 0.365);
    }, root);
  }
  owner.listen(root, "click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const family = event.target.closest("[data-atlas-select]");
    if (family) {
      const source = sources.find((item) => item.dataset.atlasDetail === family.dataset.atlasSelect);
      if (!source) return;
      event.preventDefault();
      open(family, source);
    }
    if (event.target.closest("[data-atlas-close]")) close();
  });
  owner.listen(dialog, "cancel", (event) => { event.preventDefault(); close(); });
  owner.listen(window, "keydown", (event) => { if (event.key === "Escape" && state === "preparing") close(); });
  owner.listen(dialog, "keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll("button:not([disabled]),a[href],summary")].filter((element) => element.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  owner.listen(dialog, "close", () => {
    // A queued native close event may arrive after another family has reopened.
    if (!dialog.open && state !== "closed" && state !== "preparing") finishClose();
  });
  owner.listen(dialog, "click", (event) => { if (event.target === dialog) close(); });
  owner.listen(reduced, "change", () => {
    if (state === "opening") settleOpen();
    else if (state === "closing") finishClose();
  });
  links.forEach((link) => {
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-controls", dialog.id);
  });
  root.dataset.enhanced = "true";
  setState("closed");
  function restoreHash() {
    const link = links.find((item) => item.hash === location.hash);
    if (!link) return;
    if (state === "closed") root.scrollIntoView({ behavior: "instant", block: "start" });
    link.click();
  }
  owner.listen(window, "hashchange", restoreHash);
  restoreHash();
  owner.cleanup(() => {
    finishClose(false);
    content.replaceChildren();
    image.removeAttribute("src");
    delete root.dataset.enhanced;
    links.forEach((link) => { link.removeAttribute("aria-haspopup"); link.removeAttribute("aria-controls"); });
  });
  owner.listen(window, "pagehide", (event) => { if (!event.persisted) owner.dispose(); });
  window.__phase2945Atlas = {
    dispose: () => owner.dispose(),
    remount() { owner.dispose(); mountAtlas(); },
    get diagnostics() {
      return { open: dialog.open, state, family: root.dataset.detail ?? null, sources: sources.length, variant: root.dataset.typography, dossier: root.dataset.dossier, flights: dialog.querySelectorAll(".atlas45-flight").length };
    },
  };
}
mountAtlas();
