import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";
gsap.registerPlugin(ScrollTrigger);
function mountFilm() {
  const owner = createOwnership(),
    root = document.querySelector(".unified-hero"),
    frame = root.querySelector(".film-frame"),
    video = root.querySelector("video"),
    toggle = root.querySelector("#film-toggle"),
    status = root.querySelector("#film-status"),
    engineering = document.querySelector("#engineering");
  const reduced = matchMedia("(prefers-reduced-motion:reduce)"),
    tall = matchMedia("(min-height:600px)");
  let composition;
  let decodedTime = 0,
    frameCallbacks = 0;
  let visible = false,
    paused = false,
    failed = false,
    bridge = 0;
  const eligible = () => !reduced.matches && tall.matches;
  function sync() {
    const play =
      owner.alive &&
      visible &&
      !paused &&
      !failed &&
      eligible() &&
      !document.hidden &&
      bridge <= 0 &&
      !video.ended;
    toggle.hidden = !owner.alive || failed || !eligible() || bridge > 0;
    toggle.inert = toggle.hidden;
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
          bridge > 0
        )
          return;
        paused = true;
        root.dataset.playRejected = "true";
        toggle.setAttribute("aria-pressed", "true");
        toggle.textContent = "Воспроизвести фильм";
      });
    } else {
      video.pause();
    }
    if (!eligible() || failed) {
      root.dataset.ready = "false";
      composition?.time(0);
    }
  }
  video.muted = true;
  video.loop = false;
  function toggleMotion() {
    if (!eligible() || failed || bridge > 0) return;
    paused = !paused;
    if (!paused && video.ended) {
      video.currentTime = 0;
      composition?.time(0);
    }
    sync();
  }
  owner.listen(toggle, "click", toggleMotion);
  owner.listen(frame, "click", (event) => {
    if (event.target.closest("a,button,input,summary")) return;
    if (getSelection()?.toString()) return;
    toggleMotion();
  });
  owner.listen(video, "playing", () => {
    root.dataset.ready = "true";
    delete root.dataset.playRejected;
  });
  owner.listen(video, "ended", () => {
    paused = true;
    sync();
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
      const field = document.createElement("div");
      field.className = "film-field";
      const drawing = engineering
        .querySelector(".paper-geometry")
        .cloneNode(true);
      drawing.setAttribute("class", "film-drawing");
      drawing.setAttribute("aria-hidden", "true");
      for (const node of [field, drawing])
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
      frame.append(field, drawing);
      const measure = () => {
        const source = engineering
          .querySelector(".paper-base .geometry-frame")
          .getBoundingClientRect();
        const stage = engineering
          .querySelector(".structural-stage")
          .getBoundingClientRect();
        gsap.set(drawing, {
          autoRound: false,
          left: source.left,
          top: source.top - stage.top,
          width: source.width,
          height: source.height,
        });
      };
      let tick, frameCallback, seek, pictureChange;
      let active = true;
      const pictureBreakpoint = matchMedia("(max-width:900px)");
      const imageErrors = [];
      const context = gsap.context(() => {
        root.dataset.enhanced = "true";
        const titles = [...root.querySelectorAll(".hero-accent")];
        composition = gsap.timeline({
          paused: true,
          defaults: { ease: "power2.inOut" },
        });
        composition
          .set(video, { opacity: 1 }, 0)
          .to(
            root.querySelector(".hero-house"),
            { opacity: 0, duration: 0.9 },
            1.9,
          );
        const accents = [
          [titles[0], 0, 2.1],
          [titles[1], 2.7, 6.6],
          [titles[2], 7, 10.8],
          [titles[3], 11.5, 16.1],
          [titles[4], 18.5, 22.5],
        ];
        for (const [title, start, end] of accents) {
          if (start > 0)
            composition.fromTo(
              title,
              {
                opacity: 0,
                clipPath: "inset(0 0 100% 0)",
                y: 14,
                scale: 0.985,
              },
              {
                opacity: 1,
                clipPath: "inset(0 0 0% 0)",
                y: 0,
                scale: 1,
                duration: 0.65,
              },
              start,
            );
          if (end < 22.5)
            composition.to(title, { opacity: 0, duration: 0.35 }, end - 0.35);
        }
        const reveals = [
          [root.querySelector(".reveal-amba"), 4.2, 7.5, "64%"],
          [root.querySelector(".reveal-khamoran"), 8, 11.1, "54%"],
          [root.querySelector(".reveal-dyo"), 11.9, 15, "64%"],
        ];
        const ready = new WeakSet(),
          cues = new Map();
        const visual = root.querySelector(".unified-visual");
        for (const [layer, start, end, focal] of reveals) {
          const img = layer.querySelector("img");
          const fail = () => {
            ready.delete(img);
            cues.set(layer, false);
            layer.style.visibility = "hidden";
          };
          img.addEventListener("error", fail);
          imageErrors.push([img, fail]);
          if (layer.querySelector("source"))
            pictureChange = () => {
              if (img.getAttribute("src"))
                img.decode().catch(() => {
                  if (active) fail();
                });
            };
          composition
            .set(visual, { "--focus-x": focal }, start - 0.45)
            .fromTo(
              visual,
              { "--prepare": 0 },
              { "--prepare": 0.32, duration: 0.45 },
              start - 0.45,
            )
            .to(visual, { "--prepare": 0, duration: 0.8 }, start)
            .fromTo(
              layer,
              { "--reveal-edge": "120%" },
              { "--reveal-edge": "-20%", duration: 0.9, ease: "sine.inOut" },
              start,
            )
            .to(
              layer,
              { "--reveal-edge": "120%", duration: 0.75, ease: "sine.inOut" },
              end - 0.75,
            );
        }
        composition
          .to(
            root.querySelector(".hero-shade"),
            { opacity: 0.9, duration: 1 },
            3,
          )
          .to(
            root.querySelector(".hero-shade"),
            { opacity: 1, duration: 1 },
            10.9,
          )
          .to(
            root.querySelector(".hero-shade"),
            { opacity: 0.88, duration: 0.8 },
            15.2,
          )
          .to(
            root.querySelector(".hero-shade"),
            { opacity: 1, duration: 0.8 },
            18.1,
          );
        const render = (time) => {
          if (root.dataset.ready !== "true") return;
          for (const [layer, start] of reveals) {
            const img = layer.querySelector("img");
            if (img.complete && img.naturalWidth) ready.add(img);
            else if (img.complete && img.getAttribute("src")) {
              ready.delete(img);
              cues.set(layer, false);
            }
            const alternate = layer.querySelector("source");
            if (alternate && time >= start - 3 && !alternate.srcset)
              alternate.srcset = alternate.dataset.srcset;
            if (!img.getAttribute("src") && time >= start - 3) {
              img.src = alternate
                ? img.dataset.src
                : matchMedia("(max-width:900px)").matches &&
                    img.dataset.mobileSrc
                  ? img.dataset.mobileSrc
                  : img.dataset.src;
              img
                .decode()
                .then(() => {
                  if (owner.alive) ready.add(img);
                })
                .catch(() => {});
            }
            if (time < start) cues.delete(layer);
            // Missed decoding skips this cue instead of exposing a half-revealed house.
            else if (!cues.has(layer)) cues.set(layer, ready.has(img));
          }
          composition.time(time);
          for (const [layer] of reveals)
            layer.style.visibility = cues.get(layer) ? "" : "hidden";
        };
        seek = () => {
          cues.clear();
          decodedTime = video.currentTime;
          render(decodedTime);
        };
        video.addEventListener("seeked", seek);
        tick = () => render(video.currentTime);
        if ("requestVideoFrameCallback" in video) {
          const present = (_, metadata) => {
            decodedTime = metadata.mediaTime;
            frameCallbacks++;
            render(decodedTime);
            frameCallback = video.requestVideoFrameCallback(present);
          };
          frameCallback = video.requestVideoFrameCallback(present);
        } else gsap.ticker.add(tick);
        const handoff = gsap
          .timeline({ paused: true, defaults: { ease: "none" } })
          .fromTo(
            root.querySelector(".unified-copy"),
            { opacity: 1 },
            { opacity: 0, duration: 0.22 },
            0,
          )
          .fromTo(field, { opacity: 0 }, { opacity: 1, duration: 0.46 }, 0.08)
          .fromTo(drawing, { opacity: 0 }, { opacity: 1, duration: 0.34 }, 0.48)
          .set(drawing, { opacity: 1 }, 1);
        const update = (self) => {
          const previous = bridge;
          bridge = self.progress;
          root.dataset.bridge =
            bridge >= 1 ? "complete" : bridge > 0 ? "active" : "before";
          document.body.dataset.filmHandoff = String(bridge > 0 && bridge < 1);
          if (previous <= 0 !== bridge <= 0) sync();
          handoff.progress(bridge);
        };
        measure();
        ScrollTrigger.create({
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
      }, root);
      pictureBreakpoint.addEventListener("change", pictureChange);
      if (video.readyState >= 2 && video.getAttribute("src") && !failed) {
        root.dataset.ready = "true";
        seek();
      }
      return () => {
        active = false;
        pictureBreakpoint.removeEventListener("change", pictureChange);
        gsap.ticker.remove(tick);
        if (frameCallback !== undefined)
          video.cancelVideoFrameCallback(frameCallback);
        video.removeEventListener("seeked", seek);
        for (const [img, fail] of imageErrors)
          img.removeEventListener("error", fail);
        context.revert();
        composition = undefined;
        delete root.dataset.enhanced;
        for (const node of [field, drawing]) node.remove();
        bridge = 0;
        delete root.dataset.bridge;
        delete document.body.dataset.filmHandoff;
        delete document.body.dataset.filmImmersive;
        sync();
      };
    },
  );
  owner.cleanup(() => {
    toggle.hidden = true;
    toggle.inert = false;
    observer.disconnect();
    media.revert();
    video.pause();
    video.removeAttribute("src");
    video.load();
    status.textContent = "";
    for (const key of ["ready", "playRejected"]) delete root.dataset[key];
  });
  window.__phase2942Hero =
    window.__phase2941Hero =
    window.__phase2940Hero =
    window.__phase2938Film =
      {
        get diagnostics() {
          return {
            playing: !video.paused,
            paused,
            source: video.getAttribute("src"),
            time: video.currentTime,
            bridge,
            eligible: eligible(),
            ready: root.dataset.ready,
            compositionTime: composition?.time() ?? 0,
            decodedTime,
            frameCallbacks,
            frameSync:
              "requestVideoFrameCallback" in video
                ? "decoded-frame"
                : "ticker-fallback",
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
