import libraryData from "/glamping-preview/cinematic/proof/gallery-library.mjs";
export function mountGallery(root, owner, onReady) {
  const gallery = root.querySelector(".compact-gallery");
  if (!gallery) return;
  const find = (selector) => gallery.querySelector(selector);
  const dialog = root.querySelector("#gallery-dialog");
  const mainImage = find("#gallery-open img");
  const modalImage = dialog.querySelector("#gallery-dialog-image");
  const status = find("#gallery-status");
  const preloads = [];
  const memory = new Map();
  let library = [];
  let activeFamily = "amba";
  let selected;
  let displayedItem;
  let requestVersion = 0;
  let restoreVersion = 0;
  let focusRAF;
  let opener;
  let visible = false;
  let imageAnimations = [];
  let outgoing;
  let familyAnimation;
  let dialogVersion = 0;
  let dialogAnimations = [];
  let dialogOutgoing;
  let closing = false;
  let closeRequested = false;
  let scrollLock;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const familyNav = find(".gallery-families");
  const familyIndicator = document.createElement("span");
  familyIndicator.className = "p299-family-indicator";
  familyIndicator.setAttribute("aria-hidden", "true");
  familyNav.append(familyIndicator);
  function stopImageTransition() {
    imageAnimations.forEach((animation) => animation.cancel());
    imageAnimations = [];
    outgoing?.remove();
    outgoing = undefined;
  }
  function stopDialogTransition() {
    dialogAnimations.forEach((animation) => animation.cancel());
    dialogAnimations = [];
    dialogOutgoing?.remove();
    dialogOutgoing = undefined;
  }
  function lockScroll() {
    if (scrollLock) return;
    const html = document.documentElement;
    const body = document.body;
    scrollLock = {
      x: scrollX,
      y: scrollY,
      destination: location.pathname + location.hash,
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      padding: html.style.paddingRight,
    };
    const gap = innerWidth - html.clientWidth;
    if (gap) html.style.paddingRight = `${gap}px`;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
  }
  function unlockScroll() {
    if (!scrollLock) return;
    const position = scrollLock;
    scrollLock = undefined;
    document.documentElement.style.overflow = position.htmlOverflow;
    document.documentElement.style.paddingRight = position.padding;
    document.body.style.overflow = position.bodyOverflow;
    if (
      location.pathname + location.hash === position.destination &&
      (scrollX !== position.x || scrollY !== position.y)
    )
      window.scrollTo({
        left: position.x,
        top: position.y,
        behavior: "instant",
      });
  }
  function commitCaption(item) {
    const position = indexOf(item);
    const items = familyItems(item.familySlug);
    find("#gallery-active-label").textContent =
      `${item.family.toUpperCase()} / ${pad(position + 1)} — ${pad(items.length)}`;
    find("#gallery-active-caption").textContent = item.caption;
  }
  function positionFamilyIndicator(animate = true) {
    const button = familyNav.querySelector('[aria-pressed="true"]');
    if (!button) return;
    const previous = familyIndicator.getBoundingClientRect();
    familyAnimation?.cancel();
    familyIndicator.style.width = `${button.offsetWidth}px`;
    familyIndicator.style.left = `${button.offsetLeft}px`;
    if (animate && !reduced.matches) {
      const destination = familyIndicator.getBoundingClientRect();
      familyAnimation = familyIndicator.animate(
        [
          {
            left: `${button.offsetLeft + previous.left - destination.left}px`,
            width: `${previous.width}px`,
          },
          {
            left: `${button.offsetLeft}px`,
            width: `${button.offsetWidth}px`,
          },
        ],
        { duration: 260, easing: "cubic-bezier(.22,.68,.22,1)" },
      );
    }
  }
  const families = ["amba", "dyo", "khamoran", "chum"];
  const familyItems = (slug) =>
    library.filter((item) => item.familySlug === slug);
  const firstFrame = (slug) => {
    const items = familyItems(slug);
    return (
      items.find((item) => item.primary) ||
      items.find((item) => item.id === "ASSET-P14-f39afb84347024ce") || items[0]
    );
  };
  const srcset = (item) =>
    `${item.thumbnail} ${item.thumbnailWidth}w, ${item.image} ${item.width}w`;
  const sizes = "(max-width:600px) 92vw, 76vw";
  const pad = (number) => String(number).padStart(2, "0");
  const indexOf = (item) => familyItems(item.familySlug).indexOf(item);
  function neighbor(offset) {
    const items = familyItems(activeFamily);
    return items[
      (items.indexOf(selected) + offset + items.length) % items.length
    ];
  }
  function writeURL(modal, replace = false) {
    const url = new URL(location.href);
    url.searchParams.set("family", activeFamily);
    url.searchParams.delete("kind");
    if (familyItems(activeFamily).includes(selected))
      url.searchParams.set("frame", selected.id);
    else url.searchParams.delete("frame");
    if (modal) url.searchParams.set("view", "image");
    else url.searchParams.delete("view");
    const state = {
      ...history.state,
      phase291Gallery: true,
      phase291Modal: modal,
    };
    history[replace ? "replaceState" : "pushState"](state, "", url);
  }
  function imageAttributes(image, item, full = false) {
    image.width = item.width;
    image.height = item.height;
    image.alt = `${item.title}: ${item.observation}`;
    image.sizes = full ? "100vw" : sizes;
    image.srcset = srcset(item);
    image.src = item.image;
    image.decoding = "async";
  }
  function errorMessage(element, item) {
    element.replaceChildren(
      document.createTextNode("Кадр не загрузился. Выберите соседний или "),
    );
    const link = document.createElement("a");
    link.href = item.image;
    link.textContent = "откройте файл отдельно";
    element.append(link, document.createTextNode("."));
    element.hidden = false;
  }
  function preloadNeighbors() {
    if (!owner.alive) return;
    preloads.splice(0).forEach((link) => link.remove());
    if (!visible && !dialog.open) return;
    for (const item of new Set([neighbor(-1), neighbor(1)].filter(Boolean))) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.imageSrcset = srcset(item);
      link.imageSizes = dialog.open ? "100vw" : sizes;
      link.href = item.image;
      document.head.append(link);
      preloads.push(link);
    }
  }
  function renderControls() {
    const items = familyItems(activeFamily);
    const empty = items.length === 0;
    for (const button of [
      find("#gallery-previous"),
      find("#gallery-next"),
      dialog.querySelector("#gallery-dialog-previous"),
      dialog.querySelector("#gallery-dialog-next"),
    ])
      button.disabled = items.length < 2;
    gallery.dataset.family = activeFamily;
    gallery.dataset.empty = String(empty);
    find(".gallery-stage").hidden = empty;
    find(".gallery-image-controls").hidden = empty;
    const emptyMessage = find("#gallery-empty");
    if (emptyMessage) emptyMessage.hidden = !empty;
    gallery.querySelectorAll("[data-gallery-family]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.galleryFamily === activeFamily),
      );
    });
    positionFamilyIndicator();
    if (empty) {
      preloads.splice(0).forEach((link) => link.remove());
      return;
    }
    find(".gallery-stage").dataset.material = selected.kind;
    find("#gallery-material-kind").textContent =
      selected.zone === "exterior"
        ? "АР / АРХИТЕКТУРНЫЙ ОБРАЗ"
        : "ИР / ПРОСТРАНСТВО";
    find(".gallery-stage").dataset.shape =
      selected.width < selected.height ? "portrait" : "landscape";
    const openLink = find("#gallery-open");
    openLink.href = selected.image;
    openLink.setAttribute(
      "aria-label",
      `Открыть ${selected.title}: ${selected.observation}`,
    );
    gallery.querySelectorAll("[data-gallery-peer]").forEach((button, index) => {
      const item = neighbor(index ? -1 : 1);
      button.dataset.id = item.id;
      button.setAttribute(
        "aria-label",
        `Выбрать ${item.title}: ${item.observation}`,
      );
      const image = button.querySelector("img");
      image.src = item.thumbnail;
      image.width = item.thumbnailWidth;
      image.height = item.thumbnailHeight;
      button.querySelector("span").textContent =
        `${pad(items.indexOf(item) + 1)} / ${item.family.toUpperCase()}`;
    });
    preloadNeighbors();
  }
  function commitDialog(item) {
    dialog.dataset.frame = item.id;
    dialog.querySelector("#gallery-dialog-title").textContent =
      item.family.toUpperCase();
    dialog.querySelector("#gallery-dialog-count").textContent =
      `${pad(indexOf(item) + 1)} — ${pad(familyItems(item.familySlug).length)}`;
  }
  async function loadDialog() {
    const version = ++dialogVersion;
    const item = selected;
    const picture = dialog.querySelector(".gallery-dialog-picture");
    const sameFrame = dialog.dataset.frame === item.id;
    picture.setAttribute("aria-busy", "true");
    dialog.querySelector("#gallery-dialog-error").hidden = true;
    const decoded = new Image();
    imageAttributes(decoded, item, true);
    try {
      await decoded.decode();
      if (!owner.alive || version !== dialogVersion || !dialog.open || closing)
        return;
      if (!sameFrame) {
        stopDialogTransition();
        if (!reduced.matches && modalImage.currentSrc) {
          dialogOutgoing = modalImage.cloneNode();
          dialogOutgoing.removeAttribute("id");
          dialogOutgoing.className = "gallery-dialog-outgoing";
          dialogOutgoing.alt = "";
          dialogOutgoing.setAttribute("aria-hidden", "true");
          modalImage.after(dialogOutgoing);
        }
      }
      imageAttributes(modalImage, item, true);
      commitDialog(item);
      if (dialogOutgoing) {
        const previous = dialogOutgoing;
        const animation = previous.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 280,
          easing: "cubic-bezier(.22,.68,.22,1)",
        });
        dialogAnimations.push(animation);
        animation.finished
          .then(() => {
            if (dialogOutgoing === previous) stopDialogTransition();
          })
          .catch(() => {});
      }
    } catch {
      if (!owner.alive || version !== dialogVersion || !dialog.open || closing)
        return;
      // Keep the decoded photograph and its label while the failed request can be skipped.
      errorMessage(dialog.querySelector("#gallery-dialog-error"), item);
    }
    if (version === dialogVersion) picture.removeAttribute("aria-busy");
  }
  async function loadSelected() {
    if (!owner.alive || !familyItems(activeFamily).includes(selected)) return;
    const version = ++requestVersion;
    const item = selected;
    const stage = find(".gallery-stage");
    const error = find("#gallery-main-error");
    stage.setAttribute("aria-busy", "true");
    error.hidden = true;
    const decoded = new Image();
    imageAttributes(decoded, item);
    try {
      await decoded.decode();
      if (version !== requestVersion) return;
      stopImageTransition();
      const changed = mainImage.getAttribute("src") !== item.image;
      if (changed && !reduced.matches && !mainImage.hidden) {
        outgoing = mainImage.cloneNode();
        outgoing.className = "p299-image-outgoing";
        outgoing.alt = "";
        outgoing.setAttribute("aria-hidden", "true");
        mainImage.after(outgoing);
      }
      imageAttributes(mainImage, item);
      if (changed) mainImage.style.removeProperty("object-position");
      mainImage.hidden = false;
      displayedItem = item;
      commitCaption(item);
      if (outgoing) {
        const previous = outgoing;
        imageAnimations = [
          outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 300,
            easing: "cubic-bezier(.22,.68,.22,1)",
          }),
          mainImage.animate(
            [
              { opacity: 0.8, transform: "translateX(7px)" },
              { opacity: 1, transform: "translateX(0)" },
            ],
            {
              duration: 300,
              easing: "cubic-bezier(.22,.68,.22,1)",
            },
          ),
        ];
        imageAnimations[0].finished
          .then(() => {
            if (outgoing === previous) stopImageTransition();
          })
          .catch(() => {
            if (!owner.alive) return;
          });
      }
      gallery.dispatchEvent(
        new CustomEvent("gallery:framechange", {
          bubbles: true,
          detail: { image: item.image, alt: mainImage.alt },
        }),
      );
    } catch {
      if (version !== requestVersion) return;
      // Preserve the last decoded frame while offering a native path to the failed source.
      stopImageTransition();
      errorMessage(error, item);
    }
    stage.removeAttribute("aria-busy");
  }
  async function select(item, { record = true, load = true } = {}) {
    if (!owner.alive || !item || (record && (closing || closeRequested)))
      return;
    selected = item;
    memory.set(item.familySlug, item.id);
    activeFamily = item.familySlug;
    renderControls();
    status.textContent = `${item.family}: ${indexOf(item) + 1} из ${familyItems(item.familySlug).length}.`;
    if (record) writeURL(dialog.open, dialog.open);
    await Promise.all([
      dialog.open && !closing ? loadDialog() : undefined,
      load ? loadSelected() : undefined,
    ]);
  }
  async function filter({ family = activeFamily } = {}, record = true) {
    if (!owner.alive || (record && (closing || closeRequested))) return;
    activeFamily = family;
    const items = familyItems(activeFamily);
    if (items.length) {
      await select(
        items.includes(selected)
          ? selected
          : items.find((item) => item.id === memory.get(activeFamily)) ||
              firstFrame(activeFamily),
        {
          record,
        },
      );
      return;
    }
    ++requestVersion;
    stopImageTransition();
    find(".gallery-stage").removeAttribute("aria-busy");
    renderControls();
    status.textContent =
      "Экстерьер Дё отсутствует в предоставленной подборке. Выберите «Все изображения» или «Интерьеры».";
    if (record) writeURL(false);
  }
  function containedRect(image, item) {
    const box = image.getBoundingClientRect();
    const scale = Math.min(box.width / item.width, box.height / item.height);
    return {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      width: item.width * scale,
      height: item.height * scale,
    };
  }
  function thumbnailTransform() {
    let image;
    if (
      opener?.id === "gallery-open" &&
      mainImage.getAttribute("src") === selected.image
    )
      image = mainImage;
    else if (opener?.dataset.id === selected.id)
      image = opener.querySelector("img");
    if (!image?.isConnected || getComputedStyle(image).objectFit !== "contain")
      return;
    const box = image.getBoundingClientRect();
    if (
      box.top < 0 ||
      box.left < 0 ||
      box.bottom > innerHeight ||
      box.right > innerWidth ||
      !box.width ||
      !box.height
    )
      return;
    const source = containedRect(image, selected);
    const destination = containedRect(modalImage, selected);
    if (!destination.width) return;
    return `translate(${source.x - destination.x}px, ${source.y - destination.y}px) scale(${source.width / destination.width})`;
  }
  function openModal(trigger, record = true) {
    if (!owner.alive || !familyItems(activeFamily).includes(selected)) return;
    cancelAnimationFrame(focusRAF);
    opener = trigger || find("#gallery-open");
    closing = false;
    closeRequested = false;
    ++dialogVersion;
    stopDialogTransition();
    if (!dialog.open) {
      const thumbnail = opener.querySelector("img");
      const isCurrent =
        opener.dataset.id === selected.id ||
        (opener.id === "gallery-open" &&
          mainImage.getAttribute("src") === selected.image);
      const hasThumbnail =
        isCurrent && thumbnail?.complete && thumbnail.naturalWidth;
      const hasPrevious =
        displayedItem && mainImage.complete && mainImage.naturalWidth;
      const previewItem = hasThumbnail
        ? selected
        : hasPrevious
          ? displayedItem
          : selected;
      modalImage.width = previewItem.width;
      modalImage.height = previewItem.height;
      modalImage.alt = `${previewItem.title}: ${previewItem.observation}`;
      modalImage.removeAttribute("srcset");
      modalImage.src = hasThumbnail
        ? thumbnail.currentSrc
        : hasPrevious
          ? mainImage.currentSrc
          : selected.thumbnail;
      commitDialog(previewItem);
      lockScroll();
      dialog.showModal();
      if (!reduced.matches) {
        const transform = thumbnailTransform();
        const options = {
          duration: 440,
          easing: "cubic-bezier(.22,.68,.22,1)",
        };
        dialogAnimations.push(
          dialog.animate(
            [{ backgroundColor: "#16191600" }, { backgroundColor: "#161916" }],
            options,
          ),
          modalImage.animate(
            transform
              ? [{ transform }, { transform: "none" }]
              : [
                  { opacity: 0.4, transform: "scale(.985)" },
                  { opacity: 1, transform: "none" },
                ],
            options,
          ),
          ...[
            dialog.querySelector(".gallery-dialog-head"),
            dialog.querySelector(".gallery-dialog-controls"),
          ].map((element) =>
            element.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: 220,
              delay: 120,
              fill: "backwards",
            }),
          ),
        );
      }
    }
    loadDialog();
    preloadNeighbors();
    if (record) writeURL(true);
    dialog.querySelector("#gallery-close").focus({ preventScroll: true });
  }
  function restoreFocus() {
    if (!owner.alive) return;
    (opener?.isConnected ? opener : find("#gallery-open")).focus({
      preventScroll: true,
    });
  }
  async function closeModal(fromHistory = false) {
    if (!dialog.open || closing) return;
    if (!fromHistory && history.state?.phase291Modal) {
      if (closeRequested) return;
      closeRequested = true;
      history.back();
      return;
    }
    closing = true;
    const closeVersion = ++dialogVersion;
    stopDialogTransition();
    if (!reduced.matches) {
      const transform = thumbnailTransform();
      dialogAnimations = [
        modalImage.animate(
          transform
            ? [
                { transform: "none", opacity: 1 },
                { transform, opacity: 1 },
              ]
            : [{ opacity: 1 }, { opacity: 0 }],
          {
            duration: transform ? 360 : 220,
            easing: "cubic-bezier(.22,.68,.22,1)",
            fill: "forwards",
          },
        ),
        ...[
          dialog.querySelector(".gallery-dialog-head"),
          dialog.querySelector(".gallery-dialog-controls"),
        ].map((element) =>
          element.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 160,
            fill: "forwards",
          }),
        ),
        dialog.animate(
          [{ backgroundColor: "#161916" }, { backgroundColor: "#16191600" }],
          { duration: transform ? 360 : 220, fill: "forwards" },
        ),
      ];
      await Promise.allSettled(
        dialogAnimations.map((animation) => animation.finished),
      );
    }
    if (!owner.alive || closeVersion !== dialogVersion || !closing) return;
    dialog.close();
    stopDialogTransition();
    unlockScroll();
    closing = false;
    closeRequested = false;
    modalImage.removeAttribute("src");
    modalImage.removeAttribute("srcset");
    if (!fromHistory) writeURL(false, true);
    const version = restoreVersion;
    const closedURL = location.href;
    cancelAnimationFrame(focusRAF);
    // Native history restores focus after popstate; return it after that traversal.
    focusRAF = requestAnimationFrame(() => {
      if (
        !dialog.open &&
        version === restoreVersion &&
        closedURL === location.href
      )
        restoreFocus();
    });
  }
  async function restoreURL() {
    const version = ++restoreVersion;
    const url = new URL(location.href);
    const wantsModal = url.searchParams.get("view") === "image";
    const retainedFrame = !wantsModal && closeRequested ? selected : undefined;
    const requestedFrame = url.searchParams.get("frame");
    const requestedItem = library.find((item) => item.id === requestedFrame);
    const slug = families.includes(url.searchParams.get("family"))
      ? url.searchParams.get("family")
      : requestedFrame === "ASSET-P14-71e9316aa98f152c"
        ? "chum"
        : "amba";
    const frame = requestedItem;
    if (url.searchParams.has("kind")) {
      url.searchParams.delete("kind");
      history.replaceState(history.state, "", url);
    }
    const item =
      retainedFrame ||
      frame ||
      familyItems(slug).find((item) => item.id === memory.get(slug)) ||
      firstFrame(slug);
    activeFamily = item?.familySlug || slug;
    // Closing the viewer retains its final frame; Back still restores its own entry.
    if (retainedFrame) writeURL(false, true);
    // Normalize the retained URL before reduced-motion close snapshots it for focus return.
    if (!wantsModal) closeModal(true);
    if (item)
      await select(item, { record: false, load: visible || Boolean(frame) });
    else await filter({ family: slug }, false);
    if (
      !owner.alive ||
      version !== restoreVersion ||
      url.href !== location.href
    )
      return;
    if (requestedFrame && (!frame || frame.familySlug !== slug))
      writeURL(wantsModal && Boolean(item), true);
    if (wantsModal && item) openModal(null, false);
  }
  Promise.resolve(libraryData)
    .then(async (data) => {
      if (!owner.alive) return;
      const anchors = [...gallery.querySelectorAll(".gallery-index-link")];
      if (
        data.length === 0 ||
        new Set(data.map((item) => item.id)).size !== data.length ||
        anchors.length !== data.length ||
        !anchors.every((anchor) =>
          data.some((item) => item.id === anchor.dataset.id),
        )
      )
        throw new Error("library mismatch");
      library = [...data];
      displayedItem = library.find(
        (item) => item.image === mainImage.getAttribute("src"),
      );
      await restoreURL();
      onReady?.({
        async openSource(source, trigger) {
          const pathname = new URL(source, location.href).pathname;
          const item = library.find((entry) => entry.image === pathname);
          if (!item || !owner.alive) return false;
          await select(item, { record: false });
          if (!owner.alive || selected !== item) return false;
          openModal(trigger);
          return true;
        },
        async selectSource(source, { objectPosition = "50% 50%" } = {}) {
          const pathname = new URL(source, location.href).pathname;
          const item = library.find((entry) => entry.image === pathname);
          if (!item || !owner.alive) return false;
          const loading = select(item, { record: false });
          const version = requestVersion;
          await loading;
          if (
            !owner.alive ||
            version !== requestVersion ||
            selected !== item ||
            mainImage.getAttribute("src") !== item.image
          )
            return false;
          stopImageTransition();
          mainImage.removeAttribute("srcset");
          mainImage.style.objectPosition = objectPosition;
          return true;
        },
        get currentSource() {
          return mainImage.getAttribute("src");
        },
        get frame() {
          return displayedItem;
        },
      });
      if (!owner.alive) return;
      gallery.querySelectorAll(".gallery-enhancement").forEach((element) => {
        element.hidden = false;
      });
      gallery.dataset.enhanced = "true";
      renderControls();
      positionFamilyIndicator(false);
      const resizeFamily = () => {
        positionFamilyIndicator(false);
        stopDialogTransition();
      };
      const stopMotion = () => {
        stopImageTransition();
        stopDialogTransition();
        familyAnimation?.cancel();
        positionFamilyIndicator(false);
      };
      const attachMotion = () => {
        owner.listen(window, "resize", resizeFamily);
        owner.listen(reduced, "change", stopMotion);
        positionFamilyIndicator(false);
      };
      attachMotion();
      owner.listen(window, "pagehide", () => {
        cancelAnimationFrame(focusRAF);
        ++dialogVersion;
        if (dialog.open) dialog.close();
        unlockScroll();
        closing = false;
        closeRequested = false;
        stopMotion();
        reduced.removeEventListener("change", stopMotion);
        window.removeEventListener("resize", resizeFamily);
      });
      owner.listen(window, "pageshow", (event) => {
        if (event.persisted) {
          attachMotion();
          restoreURL();
        }
      });
      function enableSwipe(surface) {
        let touch;
        let swiped = false;
        owner.listen(
          surface,
          "click",
          (event) => {
            if (swiped) {
              event.preventDefault();
              event.stopPropagation();
              swiped = false;
            }
          },
          true,
        );
        owner.listen(surface, "pointerdown", (event) => {
          swiped = false;
          if (event.pointerType !== "touch" || !event.isPrimary) return;
          touch = { x: event.clientX, y: event.clientY };
          surface.setPointerCapture(event.pointerId);
        });
        owner.listen(surface, "pointerup", (event) => {
          if (!touch) return;
          const dx = event.clientX - touch.x;
          const dy = event.clientY - touch.y;
          touch = undefined;
          if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          swiped = true;
          select(neighbor(dx > 0 ? -1 : 1));
        });
        owner.listen(surface, "pointercancel", () => {
          touch = undefined;
        });
      }
      enableSwipe(find("#gallery-open"));
      enableSwipe(dialog.querySelector(".gallery-dialog-picture"));
      owner.listen(find("#gallery-open"), "keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        select(neighbor(event.key === "ArrowRight" ? 1 : -1));
      });
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          visible = true;
          observer.disconnect();
          loadSelected();
          preloadNeighbors();
        },
        { rootMargin: "400px" },
      );
      observer.observe(gallery);
      owner.cleanup(() => observer.disconnect());
      owner.listen(window, "pagehide", () => observer.disconnect(), {
        once: true,
      });
      owner.listen(gallery, "click", async (event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const target = event.target.closest("button, a");
        if (!target) return;
        if (target.matches("[data-gallery-family]")) {
          await filter({ family: target.dataset.galleryFamily });
        } else if (target.matches("[data-gallery-peer]")) {
          await select(library.find((item) => item.id === target.dataset.id));
        } else if (target.id === "gallery-previous") await select(neighbor(-1));
        else if (target.id === "gallery-next") await select(neighbor(1));
        else if (target.id === "gallery-open") {
          event.preventDefault();
          openModal(target);
        } else if (target.matches(".gallery-index-link")) {
          event.preventDefault();
          const item = library.find((entry) => entry.id === target.dataset.id);
          await select(item);
          openModal(target);
        }
      });
      owner.listen(dialog.querySelector("#gallery-close"), "click", () =>
        closeModal(),
      );
      owner.listen(
        dialog.querySelector("#gallery-dialog-previous"),
        "click",
        () => select(neighbor(-1)),
      );
      owner.listen(dialog.querySelector("#gallery-dialog-next"), "click", () =>
        select(neighbor(1)),
      );
      owner.listen(dialog, "cancel", (event) => {
        event.preventDefault();
        closeModal();
      });
      owner.listen(dialog, "keydown", (event) => {
        if (event.key === "Tab") {
          const controls = [
            ...dialog.querySelectorAll("button, a[href]"),
          ].filter(
            (element) => !element.disabled && element.getClientRects().length,
          );
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          select(neighbor(event.key === "ArrowRight" ? 1 : -1));
        }
      });
      let backgroundDown = false;
      function isPictureBackground(event) {
        if (event.target === dialog) return true;
        if (!event.target.closest(".gallery-dialog-picture")) return false;
        if (event.target.closest(".gallery-error")) return false;
        const item = library.find((entry) => entry.id === dialog.dataset.frame);
        const box = containedRect(modalImage, item);
        return (
          Math.abs(event.clientX - box.x) > box.width / 2 ||
          Math.abs(event.clientY - box.y) > box.height / 2
        );
      }
      owner.listen(dialog, "pointerdown", (event) => {
        backgroundDown = isPictureBackground(event);
      });
      owner.listen(dialog, "click", (event) => {
        if (backgroundDown && isPictureBackground(event)) closeModal();
        backgroundDown = false;
      });
      owner.listen(window, "popstate", restoreURL);
    })
    .catch(() => {
      status.textContent = `Компактный просмотр недоступен. Все ${libraryData.length} изображений доступны в полном индексе ниже.`;
    });
  return () => {
    requestVersion++;
    restoreVersion++;
    dialogVersion++;
    cancelAnimationFrame(focusRAF);
    stopImageTransition();
    stopDialogTransition();
    familyAnimation?.cancel();
    if (dialog.open) dialog.close();
    unlockScroll();
    preloads.splice(0).forEach((link) => link.remove());
  };
}
