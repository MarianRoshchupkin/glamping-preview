import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { structureScrollAt } from "/glamping-preview/cinematic/legacy/controllers/motion-math.mjs";
import { mountStructure } from "/glamping-preview/cinematic/legacy/controllers/structure.mjs";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";
const root = document.querySelector(".engineering-proof");
if (root) {
  const owner = createOwnership(),
    scene = root.querySelector("#engineering"),
    stage = root.querySelector(".structural-stage"),
    photo = root.querySelector(".atlas-handoff-image"),
    picture = photo.querySelector("img"),
    gallery = document.querySelector("#projects"),
    target = gallery.querySelector("#gallery-open"),
    sourceImage = target.querySelector("img"),
    viewerControls = gallery.querySelector(".gallery-image-controls");
  root.dataset.portal = "projected-envelope";
  photo.classList.add("blueprint-portal", "continuity-photo");
  stage.append(photo);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
    outline = document.createElementNS(svg.namespaceURI, "path");
  svg.classList.add("continuity-outline");
  svg.setAttribute("aria-hidden", "true");
  outline.setAttribute("data-derived-from", "projected-source-envelope");
  svg.append(outline);
  stage.append(svg);
  let pictureReady = false,
    revision = 0,
    sourcePoints,
    startRect,
    targetRect,
    frame = 0,
    alive = true;
  const smooth = (p) => p * p * (3 - 2 * p),
    range = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a))),
    mix = (a, b, p) => a + (b - a) * p;
  function measure() {
    const box = stage.getBoundingClientRect(),
      source = scene.querySelector(".unified-main > svg"),
      matrix = source.getScreenCTM(),
      points = [];
    for (const path of source.querySelectorAll(".main-lines path"))
      for (const match of path
        .getAttribute("d")
        .matchAll(/[ML]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g)) {
        const point = new DOMPoint(
          Number(match[1]),
          Number(match[2]),
        ).matrixTransform(matrix);
        points.push({ x: point.x - box.left, y: point.y - box.top });
      }
    // Every vertex is an existing projected endpoint; this is an editorial volume envelope.
    const vertices = [
      [366.41, 520.48],
      [735.82, 210],
      [746.24, 222.39],
      [742.9, 232.96],
      [743.81, 395.38],
      [941.38, 467.6],
      [944.62, 484.85],
      [944.62, 699.13],
      [205.38, 699.13],
      [205.38, 682.95],
      [453.8, 682.95],
      [447.78, 678.59],
      [447.78, 497.62],
      [376.82, 532.87],
    ];
    const boundary = vertices.map(([x, y]) => {
      const point = new DOMPoint(x, y).matrixTransform(matrix);
      return { x: point.x - box.left, y: point.y - box.top };
    });
    if (
      !boundary.every((vertex) =>
        points.some(
          (point) =>
            Math.abs(vertex.x - point.x) < 0.001 &&
            Math.abs(vertex.y - point.y) < 0.001,
        ),
      )
    ) {
      pictureReady = false;
      root.dataset.photoFallback = "source-changed";
      return;
    }
    startRect = {
      left: Math.min(...boundary.map((p) => p.x)),
      top: Math.min(...boundary.map((p) => p.y)),
      width:
        Math.max(...boundary.map((p) => p.x)) -
        Math.min(...boundary.map((p) => p.x)),
      height:
        Math.max(...boundary.map((p) => p.y)) -
        Math.min(...boundary.map((p) => p.y)),
    };
    const lengths = boundary.map((a, i) => {
        const b = boundary[(i + 1) % boundary.length];
        return Math.hypot(b.x - a.x, b.y - a.y);
      }),
      total = lengths.reduce((a, b) => a + b, 0);
    sourcePoints = Array.from({ length: 64 }, (_, i) => {
      let distance = (total * i) / 64,
        edge = 0;
      while (distance > lengths[edge] && edge < lengths.length - 1)
        distance -= lengths[edge++];
      const a = boundary[edge],
        b = boundary[(edge + 1) % boundary.length],
        q = distance / lengths[edge];
      return { x: mix(a.x, b.x, q), y: mix(a.y, b.y, q) };
    });
    const destination = target.getBoundingClientRect();
    targetRect = {
      left: destination.left,
      top: destination.top + scrollY,
      width: destination.width,
      height: destination.height,
    };
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    sync();
  }
  function scheduleMeasure() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  }
  function decodePhoto() {
    const next = ++revision;
    pictureReady = false;
    picture.src = sourceImage.src;
    picture.width =
      sourceImage.naturalWidth || Number(sourceImage.getAttribute("width"));
    picture.height =
      sourceImage.naturalHeight || Number(sourceImage.getAttribute("height"));
    picture.loading = "eager";
    picture
      .decode()
      .then(() => {
        if (!alive || next !== revision) return;
        pictureReady = picture.naturalWidth > 0;
        delete root.dataset.photoFallback;
        measure();
      })
      .catch(() => {
        if (!alive || next !== revision) return;
        root.dataset.photoFallback = "true";
        sync();
      });
  }
  const motionQuery = matchMedia(
    "(prefers-reduced-motion:no-preference) and (min-height:600px)",
  );
  root.classList.toggle("scene-capable", motionQuery.matches);
  const unmount = mountStructure(root, owner);
  function sync() {
    const state = window.__phase2917;
    if (!state) return;
    const progress = state.progress,
      motion = root.classList.contains("motion-ready"),
      active = motion && pictureReady && !!sourcePoints,
      p = active ? range(progress, 0.84, 1) : 0,
      ink = active ? 1 - smooth(range(progress, 0.86, 0.9)) : 1,
      secondary = active ? 1 - smooth(range(progress, 0.84, 0.875)) : 1,
      morph = active ? smooth(range(progress, 0.88, 0.945)) : 0,
      reveal = active ? smooth(range(progress, 0.935, 0.97)) : 0,
      paper = active ? smooth(range(progress, 0.94, 0.975)) : 0,
      land = active ? smooth(range(progress, 0.95, 0.995)) : 0,
      landed = active ? smooth(range(progress, 0.99, 1)) : 0;
    document.body.classList.toggle("xray-gallery-motion", motion);
    root.dataset.documentationHandoff = p.toFixed(4);
    root.dataset.documentationActive = String(p > 0);
    root.style.setProperty("--doc-lines", ink);
    root.style.setProperty("--doc-secondary", secondary);
    root.style.setProperty("--doc-heading", secondary);
    root.style.setProperty("--doc-note", secondary);
    root.style.setProperty("--continuity-paper", paper);
    gallery.style.setProperty(
      "--continuity-entry",
      active ? smooth(range(progress, 0.965, 0.995)) : 1,
    );
    target.style.opacity = String(active ? landed : 1);
    target.inert = active && progress < 0.99;
    if (viewerControls) viewerControls.inert = active && progress < 0.99;
    gallery.style.setProperty(
      "--continuity-controls",
      active && progress < 0.99 ? "hidden" : "visible",
    );
    if (active) {
      const rect = Object.fromEntries(
          ["left", "top", "width", "height"].map((key) => [
            key,
            mix(
              startRect[key],
              key === "top" ? targetRect.top - scrollY : targetRect[key],
              land,
            ),
          ]),
        ),
        points = sourcePoints.map((point, i) => {
          const side = Math.floor(i / 16),
            q = (i % 16) / 16,
            x =
              rect.left +
              rect.width *
                (side === 0 ? q : side === 1 ? 1 : side === 2 ? 1 - q : 0),
            y =
              rect.top +
              rect.height *
                (side === 0 ? 0 : side === 1 ? q : side === 2 ? 1 : 1 - q);
          return { x: mix(point.x, x, morph), y: mix(point.y, y, morph) };
        });
      outline.setAttribute(
        "d",
        points
          .map(
            (point, i) =>
              `${i ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
          )
          .join("") + "Z",
      );
      svg.style.opacity = String(
        smooth(range(progress, 0.84, 0.865)) * (1 - landed),
      );
      outline.style.strokeDashoffset = String(
        1 - smooth(range(progress, 0.84, 0.88)),
      );
      outline.style.stroke = paper > 0.65 ? "#73796d" : "#f4f5f1";
      photo.style.left = rect.left + "px";
      photo.style.top = rect.top + "px";
      photo.style.width = rect.width + "px";
      photo.style.height = rect.height + "px";
      photo.style.clipPath = `polygon(${points.map((point) => `${point.x - rect.left}px ${point.y - rect.top}px`).join(",")})`;
      photo.style.opacity = String(reveal * (1 - landed));
    } else {
      photo.style.opacity = "0";
      svg.style.opacity = "0";
    }
    const entry = range(progress, 0.26, 0.285);
    root.style.setProperty(
      "--study-title",
      motion ? 1 - range(progress, 0.285, 0.34) : 1,
    );
    root.style.setProperty("--study-line-entry", 1);
    root.style.setProperty("--study-note-entry", motion ? entry : 1);
    root.dataset.studyEntry = !motion || entry === 1 ? "entered" : "transition";
    root.dataset.studyPaper = String(motion && state.blue <= 0.0001);
    root.style.setProperty("--study-dark-entry", state.blue ?? 1);
    root.dataset.studyState =
      progress < 0.32
        ? "assembled"
        : progress < 0.57
          ? "exploded"
          : progress < 0.82
            ? "projection"
            : p < 1
              ? "sheet"
              : "gallery";
  }
  outline.setAttribute("pathLength", "1");
  const observer = new MutationObserver(sync),
    imageObserver = new MutationObserver(decodePhoto),
    resizeObserver = new ResizeObserver(scheduleMeasure);
  observer.observe(scene, {
    attributes: true,
    attributeFilter: ["data-progress"],
  });
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  imageObserver.observe(sourceImage, {
    attributes: true,
    attributeFilter: ["src", "srcset"],
  });
  resizeObserver.observe(stage);
  resizeObserver.observe(target);
  owner.listen(window, "resize", scheduleMeasure);
  owner.listen(sourceImage, "load", scheduleMeasure);
  ScrollTrigger.addEventListener("refresh", scheduleMeasure);
  const media = gsap.matchMedia();
  media.add(
    "(prefers-reduced-motion:no-preference) and (min-height:600px)",
    () => {
      scheduleMeasure();
      return () => {
        document.body.classList.remove("xray-gallery-motion");
        gallery.style.removeProperty("--continuity-entry");
        target.style.removeProperty("opacity");
        target.inert = false;
        if (viewerControls) viewerControls.inert = false;
        gallery.style.removeProperty("--continuity-controls");
        photo.style.opacity = "0";
        svg.style.opacity = "0";
      };
    },
  );
  function seek(progress) {
    const trigger = ScrollTrigger.getById("phase2917");
    if (!trigger) return false;
    window.scrollTo({
      top:
        trigger.start +
        (trigger.end - trigger.start) *
          structureScrollAt(progress, innerWidth <= 600),
      behavior: "instant",
    });
    ScrollTrigger.update();
    sync();
    return true;
  }
  window.__phase2927Engineering = window.__phase2926 = {
    studySeek: seek,
    get diagnostics() {
      return {
        portal: root.dataset.portal,
        documentationProgress: Number(root.dataset.documentationHandoff),
        state: root.dataset.studyState,
        source: window.__phase2917,
        ready: pictureReady,
        silhouettePoints: sourcePoints?.length,
        photo: picture.currentSrc,
        rect: photo.getBoundingClientRect().toJSON(),
        target: target.getBoundingClientRect().toJSON(),
      };
    },
  };
  owner.cleanup(() => {
    alive = false;
    revision++;
    cancelAnimationFrame(frame);
    observer.disconnect();
    imageObserver.disconnect();
    resizeObserver.disconnect();
    ScrollTrigger.removeEventListener("refresh", scheduleMeasure);
    media.revert();
    unmount();
    svg.remove();
    document.body.classList.remove("xray-gallery-motion");
    gallery.style.removeProperty("--continuity-entry");
    target.style.removeProperty("opacity");
    target.inert = false;
    if (viewerControls) viewerControls.inert = false;
    gallery.style.removeProperty("--continuity-controls");
    delete window.__phase2926;
    delete window.__phase2927Engineering;
  });
  owner.listen(window, "pagehide", (event) => {
    if (!event.persisted) owner.dispose();
  });
  decodePhoto();
  measure();
}
