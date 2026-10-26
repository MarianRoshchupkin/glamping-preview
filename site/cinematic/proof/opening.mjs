import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";
import { mountHero } from "/glamping-preview/cinematic/proof/hero.mjs";

gsap.registerPlugin(ScrollTrigger);
function mount() {
  const owner = createOwnership();
  const hero = mountHero(owner);
  const opening = document.querySelector(".opening");
  const cover = opening.querySelector(".photo-cover");
  const target = opening.querySelector("#origin-photo");
  const transfer = document.createElement("div");
  transfer.className = "cover-transfer";
  transfer.setAttribute("aria-hidden", "true");
  const image = document.createElement("img");
  image.alt = "";
  transfer.append(image);
  opening.append(transfer);
  let bounds,
    end,
    frozenSource,
    selectedSource,
    imageWidth,
    imageHeight,
    crop,
    reverseImage,
    reverseWidth,
    reverseHeight,
    reverseCrop,
    titleBounds,
    folioBounds;
  let lastProgress = 0,
    initialized = false,
    pendingProgress = 0,
    bridgeReady = false,
    reverseReady = false,
    decodeVersion = 0,
    failed = false;
  function removeReverse() {
    reverseImage?.remove();
    reverseImage = undefined;
  }
  function measure() {
    opening.style.removeProperty("--atlas-title-y");
    opening.style.removeProperty("--atlas-folio-y");
    const box = target.getBoundingClientRect();
    bounds = {
      left: box.left,
      top: box.top + scrollY,
      width: box.width,
      height: box.height,
    };
    end = cover.offsetHeight;
    const title = opening.querySelector("#origin-title").getBoundingClientRect();
    const folio = opening.querySelector(".origin-folio").getBoundingClientRect();
    titleBounds = { top: title.top + scrollY, height: title.height, gap: box.top - title.bottom };
    folioBounds = { top: folio.top + scrollY, offset: title.top - folio.top };
  }
  function freeze(commit = true) {
    hero.suspend();
    removeReverse();
    const version = ++decodeVersion;
    bridgeReady = false;
    opening.dataset.transferDirection = commit ? "forward" : "reverse";
    const frame = hero.frame;
    frozenSource = frame.currentSrc || frame.src;
    image.src = frozenSource;
    image.style.objectPosition = getComputedStyle(frame).objectPosition;
    imageWidth = frame.naturalWidth;
    imageHeight = frame.naturalHeight;
    image.style.width = imageWidth + "px";
    image.style.height = imageHeight + "px";
    crop = image.style.objectPosition
      .split(" ")
      .map((n) => parseFloat(n) / 100);
    const destination = target.querySelector("img");
    destination.src = frozenSource;
    destination.style.objectPosition = image.style.objectPosition;
    target.href = frozenSource;
    const caption = frozenSource.includes("chum-") ? "Чум · экстерьер" : "Амба · экстерьер";
    destination.alt = caption;
    target.closest("figure").querySelector("figcaption").textContent = caption;
    const atlasReady = destination.decode();
    Promise.all([image.decode(), atlasReady])
      .then(() => {
        if (!owner.alive || version !== decodeVersion) return;
        bridgeReady = true;
        render(pendingProgress);
      })
      .catch(() => {
        if (!owner.alive || version !== decodeVersion) return;
        failed = true;
        opening.classList.remove("motion-opening");
        delete opening.dataset.transfer;
        cover.querySelector(".cover-controls").inert = false;
      });
    selectedSource = frozenSource;
  }
  function render(p) {
    pendingProgress = p;
    if (failed) return;
    if (!initialized) {
      initialized = true;
      if (p >= 1) {
        lastProgress = p;
        opening.dataset.transfer = "complete";
        cover.querySelector(".cover-controls").inert = true;
        return;
      }
    }
    if (p > 0 && !frozenSource) freeze(lastProgress < 1);
    if (lastProgress >= 1 && p < 1 && p > 0) {
      opening.dataset.transferDirection = "reverse";
      const current = target.querySelector("img");
      removeReverse();
      if (new URL(current.src).pathname !== new URL(frozenSource).pathname) {
        reverseImage = current.cloneNode();
        reverseImage.removeAttribute("srcset");
        reverseImage.src = current.currentSrc || current.src;
        reverseImage.alt = "";
        reverseImage.removeAttribute("id");
        reverseWidth = current.naturalWidth;
        reverseHeight = current.naturalHeight;
        reverseCrop = getComputedStyle(current)
          .objectPosition.split(" ")
          .map((n) => parseFloat(n) / 100);
        reverseImage.style.cssText =
          "width:" + reverseWidth + "px;height:" + reverseHeight + "px";
        transfer.append(reverseImage);
        reverseReady = false;
        const next = reverseImage;
        next
          .decode()
          .then(() => {
            if (!owner.alive || next !== reverseImage) return;
            reverseReady = true;
            render(pendingProgress);
          })
          .catch(() => {
            if (!owner.alive || next !== reverseImage) return;
            removeReverse();
            render(pendingProgress);
          });
      }
    }
    lastProgress = p;
    if (p <= 0) {
      opening.dataset.transfer = "start";
      frozenSource = undefined;
      decodeVersion++;
      bridgeReady = false;
      removeReverse();
      cover.querySelector(".cover-controls").inert = false;
      hero.resume();
      return;
    }
    if (p >= 1) {
      opening.dataset.transfer = "complete";
      removeReverse();
      cover.querySelector(".cover-controls").inert = true;
      return;
    }
    cover.querySelector(".cover-controls").inert = true;
    if (!bridgeReady || (reverseImage && !reverseReady)) {
      opening.dataset.transfer = "preparing";
      return;
    }
    opening.dataset.transfer = "active";
    const smooth = (n) => n * n * (3 - 2 * n);
    const range = (n, start, end) => Math.max(0, Math.min(1, (n - start) / (end - start)));
    const mobile = innerWidth <= 900;
    const eased = smooth(p);
    const sizeProgress = mobile ? smooth(range(p, 0.24, 1)) : eased;
    const positionProgress = mobile ? smooth(range(p, 0.52, 1)) : eased;
    const mix = (a, b, q) => a + (b - a) * q;
    const x = mix(0, bounds.left, sizeProgress),
      y = mix(0, bounds.top - scrollY, positionProgress),
      width = mix(innerWidth, bounds.width, sizeProgress),
      height = mix(innerHeight, bounds.height, sizeProgress);
    const scale = Math.max(width / imageWidth, height / imageHeight);
    const tx = x + (width - imageWidth * scale) * crop[0],
      ty = y + (height - imageHeight * scale) * crop[1];
    image.style.transform =
      "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
    if (reverseImage) {
      const scale = Math.max(width / reverseWidth, height / reverseHeight);
      const tx = x + (width - reverseWidth * scale) * reverseCrop[0],
        ty = y + (height - reverseHeight * scale) * reverseCrop[1];
      reverseImage.style.transform =
        "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
      const blend = Math.max(0, Math.min(1, (p - 0.72) / 0.28));
      reverseImage.style.opacity = blend * blend * (3 - 2 * blend);
    }
    transfer.style.clipPath =
      "inset(" +
      y +
      "px " +
      (innerWidth - x - width) +
      "px " +
      (innerHeight - y - height) +
      "px " +
      x +
      "px)";
    transfer.style.setProperty("--shade", 1 - eased);
    opening.style.setProperty("--cover-copy", Math.max(0, 1 - p / 0.18));
    opening.style.setProperty("--atlas-copy", Math.max(0, (p - 0.8) / 0.2));
    if (mobile) {
      // Keep the existing title in the space released above the photograph.
      const titleTop = y - titleBounds.height - titleBounds.gap;
      const available = smooth(range(titleTop, 12, 100));
      opening.style.setProperty("--atlas-title", available);
      opening.style.setProperty("--atlas-title-y", titleTop - (titleBounds.top - scrollY) + "px");
      opening.style.setProperty("--atlas-folio-y", titleTop - folioBounds.offset - (folioBounds.top - scrollY) + "px");
    }
  }
  const media = gsap.matchMedia();
  media.add(
    "(prefers-reduced-motion:no-preference) and (min-height:600px)",
    () => {
      const context = gsap.context(() => {
        if (!hero.frame.naturalWidth || !hero.frame.naturalHeight) return;
        opening.classList.add("motion-opening");
        measure();
        ScrollTrigger.create({
          id: "phase2927-opening",
          trigger: opening,
          start: "top top",
          end: () => "+=" + end,
          onUpdate: (s) => render(s.progress),
          onRefresh: () => {
            measure();
            render(ScrollTrigger.getById("phase2927-opening")?.progress ?? 0);
          },
        });
      }, opening);
      return () => {
        context.revert();
        opening.classList.remove("motion-opening");
        delete opening.dataset.transfer;
        delete opening.dataset.transferDirection;
        frozenSource = undefined;
        decodeVersion++;
        bridgeReady = false;
        pendingProgress = 0;
        lastProgress = 0;
        initialized = false;
        removeReverse();
        cover.querySelector(".cover-controls").inert = false;
      };
    },
  );
  owner.cleanup(() => {
    media.revert();
    transfer.remove();
  });
  owner.listen(window, "resize", () => {
    measure();
  });
  window.__phase2927 = {
    get diagnostics() {
      return {
        hero: hero.active,
        playing: hero.playing,
        source: selectedSource,
        transfer: opening.dataset.transfer,
        triggers: ScrollTrigger.getAll().map((t) => t.vars.id),
      };
    },
    dispose() {
      owner.dispose();
      delete window.__phase2927;
    },
    remount() {
      owner.dispose();
      mount();
    },
  };
  owner.listen(window, "pagehide", (event) => {
    if (!event.persisted) owner.dispose();
  });
}
await document
  .querySelector(".slide.is-current")
  .decode()
  .catch(() => {});
mount();
