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
    atlas = document.querySelector("#families");
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  let composition, preparePhotos;
  let photosReady = false;
  let decodedTime = 0,
    frameCallbacks = 0,
    loops = 0;
  let visible = false,
    paused = false,
    failed = false,
    bridge = 0;
  const eligible = () => !reduced.matches;
  function sync() {
    if (owner.alive && visible && eligible() && !failed) preparePhotos?.();
    const play =
      owner.alive &&
      visible &&
      photosReady &&
      !paused &&
      !failed &&
      eligible() &&
      !document.hidden &&
      bridge <= 0;
    toggle.hidden = !owner.alive || failed || !eligible() || bridge > 0;
    toggle.inert = toggle.hidden;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.textContent = paused ? "Воспроизвести фильм" : "Пауза фильма";
    if (play) {
      if (!video.getAttribute("src"))
        video.src = matchMedia("(max-width:900px)").matches
          ? video.dataset.mobileSrc
          : video.dataset.src;
      video.play().catch((error) => {
        if (
          error.name === "AbortError" ||
          !photosReady ||
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
  video.loop = true;
  function toggleMotion() {
    if (!eligible() || failed || bridge > 0) return;
    paused = !paused;
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
  owner.listen(video, "error", () => {
    failed = true;
    sync();
    status.textContent =
      "Видео недоступно. Сохранён статичный кадр; схема и галерея доступны.";
  });
  owner.listen(document, "visibilitychange", sync);
  owner.listen(reduced, "change", sync);
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
    "(prefers-reduced-motion:no-preference)",
    () => {
      const field = document.createElement("div");
      field.className = "film-field";
      field.setAttribute("aria-hidden", "true");
      frame.append(field);
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
                y: 12,
              },
              {
                opacity: 1,
                y: 0,
                duration: 0.9,
              },
              start,
            );
          if (end < 22.5)
            composition.to(title, { opacity: 0, duration: 0.6 }, end - 0.6);
        }
        const reveals = [
          [root.querySelector(".reveal-amba"), 4.2, 7.5, "64%"],
          [root.querySelector(".reveal-khamoran"), 8, 11.1, "54%"],
          [root.querySelector(".reveal-dyo"), 11.9, 15, "64%"],
        ];
        const ready = new WeakSet(),
          cues = new Map();
        const visual = root.querySelector(".unified-visual");
        let preparing = false,
          preparation = 0;
        preparePhotos = (reset = false) => {
          if (preparing && !reset) return;
          preparing = true;
          photosReady = false;
          const token = ++preparation;
          // A short film must not outrun the three architectural photographs.
          Promise.all(
            reveals.map(async ([layer]) => {
              const img = layer.querySelector("img"),
                alternate = layer.querySelector("source");
              if (alternate && !alternate.srcset)
                alternate.srcset = alternate.dataset.srcset;
              if (!img.getAttribute("src"))
                img.src = alternate
                  ? img.dataset.src
                  : matchMedia("(max-width:900px)").matches &&
                      img.dataset.mobileSrc
                    ? img.dataset.mobileSrc
                    : img.dataset.src;
              try {
                await img.decode();
                if (active && token === preparation) ready.add(img);
              } catch {
                if (active && token === preparation) cues.set(layer, false);
              }
            }),
          ).then(() => {
            if (!active || !owner.alive || token !== preparation) return;
            photosReady = true;
            sync();
          });
        };
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
              if (img.getAttribute("src")) {
                preparePhotos(true);
                sync();
              }
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
              { opacity: 0 },
              { opacity: 1, duration: 1.15, ease: "sine.inOut" },
              start,
            )
            .to(layer, { opacity: 0, duration: 1, ease: "sine.inOut" }, end - 1);
        }
        composition
          .to(root.querySelector(".hero-shade"), { opacity: 0.9, duration: 1 }, 3)
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
          )
          // The opaque opening image covers the native decoder's loop boundary.
          .to(
            root.querySelector(".hero-house"),
            { opacity: 1, duration: 1.2, ease: "sine.inOut" },
            21.05,
          )
          .to(titles[4], { opacity: 0, duration: 0.65 }, 21.1)
          .fromTo(
            titles[0],
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.75, immediateRender: false },
            21.5,
          );
        let previousTime = video.currentTime;
        const render = (time) => {
          if (root.dataset.ready !== "true") return;
          if (time < previousTime - 1) {
            loops++;
            cues.clear();
          }
          previousTime = time;
          for (const [layer, start] of reveals) {
            const img = layer.querySelector("img");
            if (img.complete && img.naturalWidth) ready.add(img);
            else if (img.complete && img.getAttribute("src")) {
              ready.delete(img);
              cues.set(layer, false);
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
            frameCallback = video.requestVideoFrameCallback(present);
          };
          frameCallback = video.requestVideoFrameCallback(present);
        }
        // The 24 fps film must not quantize text and crossfades to decoded-frame steps.
        gsap.ticker.add(tick);
        const handoff = gsap
          .timeline({ paused: true, defaults: { ease: "none" } })
          .fromTo(
            root.querySelector(".unified-copy"),
            { opacity: 1 },
            { opacity: 0, duration: 0.4 },
            0,
          )
          .fromTo(field, { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0)
          .fromTo(
            field,
            { "--paper-edge": "120%" },
            { "--paper-edge": "-20%", duration: 1 },
            0,
          );
        const update = (self) => {
          const previous = bridge;
          bridge = self.progress;
          root.dataset.bridge =
            bridge >= 1 ? "complete" : bridge > 0 ? "active" : "before";
          if (previous <= 0 !== bridge <= 0) sync();
        };
        ScrollTrigger.create({
          id: "phase2945-hero-atlas",
          animation: handoff,
          scrub: 0.25,
          trigger: root,
          start: () => "top top-=" + innerHeight * 0.12,
          end: "bottom top",
          onUpdate: update,
          onRefresh: update,
        });
        gsap.fromTo(
          atlas.querySelector(".atlas44-heading"),
          { y: 16 },
          {
            y: 0,
            ease: "none",
            scrollTrigger: {
              id: "phase2945-atlas-heading",
              trigger: atlas,
              start: "top bottom",
              end: "top 18%",
              scrub: true,
            },
          },
        );
        gsap.fromTo(
          atlas.querySelectorAll(".atlas44-index img"),
          { opacity: 0.28, y: 24 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.06,
            ease: "none",
            scrollTrigger: {
              id: "phase2945-atlas-entry",
              trigger: atlas,
              start: "top bottom",
              end: "top 18%",
              scrub: true,
            },
          },
        );
        ScrollTrigger.create({
          id: "phase2938-film-immersive",
          trigger: root,
          start: "top top",
          endTrigger: root,
          end: "bottom top",
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
        preparePhotos = undefined;
        photosReady = false;
        delete root.dataset.enhanced;
        field.remove();
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
  window.__phase2943Hero =
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
            loops,
            loop: video.loop,
            duration: video.duration,
            timelineCount: gsap.globalTimeline.getChildren(false).length,
            frameSync: "video-clock-display-ticker",
            decodedFrameTracking: "requestVideoFrameCallback" in video,
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
