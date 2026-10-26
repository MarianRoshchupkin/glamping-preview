import { gsap } from "gsap";
import { mountStructure } from "/glamping-preview/cinematic/legacy/controllers/structure.mjs";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";
const root = document.querySelector(".engineering-proof");
if (root) {
  const owner = createOwnership(),
    scene = root.querySelector("#engineering"),
    stage = root.querySelector(".structural-stage"),
    photo = root.querySelector(".atlas-handoff-image");
  root.dataset.portal = "editorial";
  photo.classList.add("blueprint-portal");
  stage.append(photo);
  const picture = photo.querySelector("img");
  let pictureReady = false;
  picture.src =
    "/glamping-preview/cinematic/assets/phase26-1r/client/amba-exterior-f39afb84347024ce-1600.webp";
  picture.width = 1364;
  picture.height = 908;
  root.classList.toggle(
    "scene-capable",
    matchMedia("(prefers-reduced-motion:no-preference) and (min-height:600px)")
      .matches,
  );
  const unmount = mountStructure(root, owner);
  let handoff;
  const media = gsap.matchMedia();
  media.add(
    "(prefers-reduced-motion:no-preference) and (min-height:600px)",
    () => {
      const context = gsap.context(() => {
        handoff = gsap.timeline({ paused: true });
        handoff
          .set(
            root,
            {
              "--doc-stage-ink": "#f1efe7",
              "--doc-stage-muted": "#bdc5bd",
              "--doc-surface": "100%",
              "--doc-photo": 0,
            },
            0,
          )
          .fromTo(
            root,
            { "--doc-secondary": 1, "--doc-note": 1, "--doc-heading": 1 },
            {
              "--doc-secondary": 0,
              "--doc-note": 0,
              "--doc-heading": 0,
              duration: 0.2,
            },
            0,
          )
          .fromTo(
            photo,
            { opacity: 1, clipPath: "inset(100% 0% 0% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 0.78,
              ease: "power1.out",
            },
            0.12,
          )
          .fromTo(
            root,
            { "--doc-lines": 1 },
            { "--doc-lines": 0, duration: 0.28, ease: "power1.inOut" },
            0.12,
          )
          .fromTo(
            root,
            { "--doc-surface": "100%" },
            { "--doc-surface": "0%", duration: 0.3, ease: "power1.inOut" },
            0.12,
          )
          .set(root, {}, 1);
      }, root);
      return () => {
        handoff = undefined;
        context.revert();
      };
    },
  );
  function sync() {
    const state = window.__phase2917;
    if (!state) return;
    const progress = state.progress,
      motion = root.classList.contains("motion-ready"),
      p = motion && pictureReady ? Math.min(1, Math.max(0, (progress - 0.88) / 0.12)) : 0;
    handoff?.progress(p);
    root.dataset.documentationHandoff = p.toFixed(4);
    root.dataset.documentationActive = String(p > 0);
    const entry = Math.min(1, Math.max(0, (progress - 0.26) / 0.025)),
      entered = !motion || entry === 1;
    root.style.setProperty(
      "--study-title",
      motion ? 1 - Math.min(1, Math.max(0, (progress - 0.285) / 0.055)) : 1,
    );
    root.style.setProperty("--study-line-entry", 1);
    root.style.setProperty("--study-note-entry", motion ? entry : 1);
    root.dataset.studyEntry = entered ? "entered" : "transition";
    root.dataset.studyPaper = String(motion && state.blue <= 0.0001);
    root.style.setProperty("--study-dark-entry", state.blue ?? 1);
    root.dataset.studyState =
      progress < 0.32
        ? "assembled"
        : progress < 0.57
          ? "exploded"
          : progress < 0.82
            ? "projection"
            : "sheet";

  }
  const observer = new MutationObserver(sync);
  observer.observe(scene, {
    attributes: true,
    attributeFilter: ["data-progress"],
  });
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  function seek(progress) {
    const trigger = window.ScrollTrigger?.getById("phase2917");
    if (!trigger) return false;
    window.scrollTo({
      top:
        trigger.start +
        (trigger.end - trigger.start) * Math.min(1, Math.max(0, progress)),
      behavior: "instant",
    });
    window.ScrollTrigger.update();
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
      };
    },
  };
  picture.decode().then(() => {
    if (!owner.alive) return;
    pictureReady = true;
    sync();
  }).catch(() => {
    if (owner.alive) root.dataset.photoFallback = "true";
  });
  sync();
  owner.listen(window, "pagehide", (event) => {
    if (event.persisted) return;
    observer.disconnect();
    media.revert();
    unmount();
    owner.dispose();
    delete window.__phase2926;
    delete window.__phase2927Engineering;
  });
}
