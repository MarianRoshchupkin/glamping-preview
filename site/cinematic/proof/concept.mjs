import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";
gsap.registerPlugin(ScrollTrigger);
function mountFilm() {
  const owner = createOwnership(),
    root = document.querySelector(".concept-film"),
    frame = root.querySelector(".film-frame"),
    video = root.querySelector("video"),
    controls = root.querySelector(".film-controls"),
    toggle = root.querySelector("#film-toggle"),
    status = root.querySelector("#film-status"),
    engineering = document.querySelector("#engineering");
  const reduced = matchMedia("(prefers-reduced-motion:reduce)"),
    tall = matchMedia("(min-height:600px)");
  const starts = [0, 5.8, 9.2, 12, 14.8, 18];
  let visible = false,
    paused = false,
    failed = false,
    ticking = false,
    bridge = 0,
    clock,
    timer;
  const eligible = () => !reduced.matches && tall.matches;
  const setTicking = (value) => {
    if (ticking === value) return;
    ticking = value;
    if (value) gsap.ticker.add(render);
    else gsap.ticker.remove(render);
  };
  function render() {
    clock?.time(video.currentTime, false);
    root.dataset.shot = String(
      Math.max(
        0,
        starts.findLastIndex((start) => video.currentTime >= start),
      ),
    );
  }
  function sync() {
    const play =
      owner.alive &&
      visible &&
      !paused &&
      !failed &&
      eligible() &&
      !document.hidden &&
      bridge < 0.12 &&
      !video.ended;
    controls.hidden = failed || !eligible();
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.textContent = paused ? "Воспроизвести фильм" : "Пауза фильма";
    if (play) {
      if (!video.getAttribute("src"))
        video.src = matchMedia("(max-width:900px)").matches
          ? video.dataset.mobileSrc
          : video.dataset.src;
      video.play().catch(() => {
        if (
          !owner.alive ||
          !visible ||
          paused ||
          !eligible() ||
          document.hidden ||
          bridge >= 0.12
        )
          return;
        paused = true;
        root.dataset.playRejected = "true";
        toggle.setAttribute("aria-pressed", "true");
        toggle.textContent = "Воспроизвести фильм";
        setTicking(false);
      });
    } else {
      video.pause();
      setTicking(false);
    }
    if (!eligible() || failed) root.dataset.ready = "false";
  }
  function showControls() {
    root.dataset.controls = "true";
    clearTimeout(timer);
    timer = setTimeout(() => {
      delete root.dataset.controls;
    }, 2200);
  }
  video.muted = true;
  video.loop = false;
  owner.listen(toggle, "click", () => {
    paused = !paused;
    if (!paused && video.ended) video.currentTime = 0;
    sync();
  });
  owner.listen(frame, "pointerenter", showControls);
  owner.listen(frame, "pointermove", showControls);
  owner.listen(frame, "pointerdown", showControls);
  owner.listen(frame, "focusin", showControls);
  owner.listen(video, "playing", () => {
    root.dataset.ready = "true";
    delete root.dataset.playRejected;
    setTicking(true);
  });
  owner.listen(video, "pause", () => setTicking(false));
  owner.listen(video, "ended", () => {
    paused = true;
    sync();
    render();
  });
  owner.listen(video, "error", () => {
    failed = true;
    sync();
    status.textContent =
      "Видео недоступно. Сохранён статичный кадр; схема и галерея доступны.";
  });
  owner.listen(document, "visibilitychange", sync);
  owner.listen(reduced, "change", sync);
  owner.listen(tall, "change", sync);
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      sync();
    },
    { threshold: [0, 0.45] },
  );
  observer.observe(frame);
  const media = gsap.matchMedia();
  media.add(
    "(prefers-reduced-motion:no-preference) and (min-height:600px)",
    () => {
      const final = new Image();
      final.className = "film-final";
      final.alt = "";
      final.src =
        "/glamping-preview/cinematic/media/" +
        (innerWidth <= 900
          ? "concept-final-mobile.webp"
          : "concept-final.webp");
      const field = document.createElement("div");
      field.className = "film-field";
      const drawing = engineering
        .querySelector(".paper-geometry")
        .cloneNode(true);
      drawing.setAttribute("class", "film-drawing");
      drawing.setAttribute("aria-hidden", "true");
      const register = document.createElement("div");
      register.className = "film-register";
      for (const node of [field, drawing, register])
        node.setAttribute("aria-hidden", "true");
      for (const node of drawing.querySelectorAll("[id]")) {
        const id = node.id;
        node.id = "film-" + id;
        for (const ref of drawing.querySelectorAll(
          "[fill],[stroke],[clip-path]",
        )) {
          for (const attr of ["fill", "stroke", "clip-path"]) {
            if (ref.getAttribute(attr)?.includes("#" + id))
              ref.setAttribute(
                attr,
                ref.getAttribute(attr).replaceAll("#" + id, "#film-" + id),
              );
          }
        }
      }
      frame.append(final, field, drawing, register);
      let ready = false,
        active = true,
        trigger;
      const measure = () => {
        const source = engineering
          .querySelector(".paper-base .geometry-frame")
          .getBoundingClientRect();
        const stage = engineering
          .querySelector(".structural-stage")
          .getBoundingClientRect();
        gsap.set(drawing, {
          left: source.left,
          top: source.top - stage.top,
          width: source.width,
          height: source.height,
        });
      };
      const context = gsap.context(() => {
        const words = root.querySelectorAll(".film-word");
        gsap.set(words, { opacity: 0, yPercent: 25 });
        clock = gsap.timeline({ paused: true }).to({}, { duration: 22 });
        starts.forEach((start, index) => {
          clock
            .fromTo(
              words[index],
              { opacity: 0, yPercent: 25 },
              { opacity: 1, yPercent: 0, duration: 0.45 },
              start + 0.2,
            )
            .to(
              words[index],
              { opacity: 0, yPercent: -12, duration: 0.45 },
              start + 1.7,
            );
        });
        gsap.fromTo(
          frame,
          { clipPath: "inset(12% 4%)" },
          {
            clipPath: "inset(0% 0%)",
            ease: "none",
            scrollTrigger: {
              id: "phase2938-film-entry",
              trigger: root,
              start: "top bottom",
              end: "top top",
              scrub: true,
            },
          },
        );
        const handoff = gsap
          .timeline({ paused: true, defaults: { ease: "none" } })
          .fromTo(
            final,
            { opacity: 0, scale: 1 },
            { opacity: 1, scale: 1.045, duration: 0.22 },
            0,
          )
          .fromTo(
            drawing,
            { opacity: 0, clipPath: "inset(0 100% 0 0)" },
            { opacity: 0.75, clipPath: "inset(0 0% 0 0)", duration: 0.42 },
            0.14,
          )
          .fromTo(
            field,
            { opacity: 1, clipPath: "inset(0 100% 0 0)" },
            { clipPath: "inset(0 0% 0 0)", duration: 0.5 },
            0.36,
          )
          .fromTo(
            register,
            { opacity: 0 },
            { opacity: 0.45, duration: 0.24 },
            0.34,
          )
          .to(register, { opacity: 0, duration: 0.18 }, 0.82)
          .to(drawing, { opacity: 1, duration: 0.18 }, 0.68)
          .to(frame, { opacity: 0, duration: 0.08 }, 0.92);
        const update = (self) => {
          const previous = bridge;
          bridge = self.progress;
          root.dataset.bridge =
            bridge >= 1 ? "complete" : bridge > 0 ? "active" : "before";
          document.body.dataset.filmHandoff = String(bridge > 0 && bridge < 1);
          handoff.progress(bridge);
          controls.inert = bridge > 0;
          // Final source still is optional; the poster/video continues coherently until it decodes.
          if (!ready) gsap.set(final, { opacity: 0 });
          if (previous < 0.12 !== bridge < 0.12) sync();
        };
        measure();
        trigger = ScrollTrigger.create({
          id: "phase2938-film-xray",
          trigger: engineering,
          start: "top bottom",
          end: "top top",
          onUpdate: update,
          onRefresh: (self) => {
            measure();
            update(self);
          },
        });
        ScrollTrigger.create({
          id: "phase2938-film-immersive",
          trigger: root,
          start: "top top",
          endTrigger: engineering,
          end: "top top",
          onToggle: (self) => {
            document.body.dataset.filmImmersive = String(self.isActive);
          },
        });
        final
          .decode()
          .then(() => {
            if (owner.alive && active) {
              ready = true;
              update(trigger);
            }
          })
          .catch(() => {});
      }, root);
      return () => {
        active = false;
        clock = undefined;
        context.revert();
        for (const node of [final, field, drawing, register]) node.remove();
        bridge = 0;
        delete root.dataset.bridge;
        delete document.body.dataset.filmHandoff;
        delete document.body.dataset.filmImmersive;
        sync();
      };
    },
  );
  owner.cleanup(() => {
    clearTimeout(timer);
    controls.hidden = true;
    setTicking(false);
    observer.disconnect();
    media.revert();
    video.pause();
    video.removeAttribute("src");
    video.load();
    status.textContent = "";
    for (const key of ["ready", "controls", "playRejected"])
      delete root.dataset[key];
  });
  window.__phase2938Film = {
    get diagnostics() {
      return {
        shot: root.dataset.shot,
        playing: !video.paused,
        paused,
        source: video.getAttribute("src"),
        time: video.currentTime,
        bridge,
        triggers: ScrollTrigger.getAll().map((t) => t.vars.id),
      };
    },
    dispose: () => owner.dispose(),
    remount() {
      owner.dispose();
      mountFilm();
    },
  };
  owner.listen(window, "pagehide", (event) => {
    if (!event.persisted) owner.dispose();
  });
  sync();
}
mountFilm();
const navigation = createOwnership();
function legacyHash() {
  if (location.hash === "#about")
    document.querySelector("#engineering").scrollIntoView();
  document.querySelector(".cover-menu").open = false;
}
navigation.listen(window, "hashchange", legacyHash);
legacyHash();
navigation.listen(window, "pagehide", (event) => {
  if (!event.persisted) navigation.dispose();
});
