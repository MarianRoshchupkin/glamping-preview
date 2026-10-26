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
    external = document.querySelector("#film-external-toggle"),
    status = document.querySelector("#film-status");
  const reduced = matchMedia("(prefers-reduced-motion:reduce)"),
    tall = matchMedia("(min-height:600px)");
  let visible = false,
    paused = false,
    failed = false,
    ticking = false,
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
      video.currentTime >= 9 ? 2 : video.currentTime >= 4.5 ? 1 : 0,
    );
  }
  function sync() {
    const play =
      visible && !paused && !failed && eligible() && !document.hidden;
    controls.hidden = external.hidden = failed || !eligible();
    for (const button of [toggle, external]) {
      button.setAttribute("aria-pressed", String(paused));
      button.textContent = paused ? "Воспроизвести фильм" : "Пауза фильма";
    }
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
          document.hidden
        )
          return;
        paused = true;
        for (const button of [toggle, external])
          button.setAttribute("aria-pressed", "true");
        root.dataset.playRejected = "true";
        toggle.textContent = "Воспроизвести фильм";
        external.textContent = toggle.textContent;
        setTicking(false);
      });
    } else {
      video.pause();
      setTicking(false);
    }
    if (!eligible() || failed) root.dataset.ready = "false";
  }
  function togglePause() {
    paused = !paused;
    sync();
  }
  function showControls() {
    root.dataset.controls = "true";
    clearTimeout(timer);
    timer = setTimeout(() => {
      delete root.dataset.controls;
    }, 2200);
  }
  video.muted = true;
  video.loop = true;
  owner.listen(toggle, "click", togglePause);
  owner.listen(external, "click", togglePause);
  owner.listen(frame, "pointermove", showControls);
  owner.listen(frame, "pointerdown", showControls);
  owner.listen(video, "playing", () => {
    root.dataset.ready = "true";
    delete root.dataset.playRejected;
    setTicking(true);
  });
  owner.listen(video, "pause", () => setTicking(false));
  owner.listen(video, "seeked", render);
  owner.listen(video, "error", () => {
    failed = true;
    sync();
    status.textContent =
      "Видео недоступно. Сохранён статичный образ среды. Архитектурная схема и галерея доступны.";
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
      const context = gsap.context(() => {
        const words = root.querySelectorAll(".film-word");
        gsap.set(words, {
          opacity: 0,
          yPercent: 30,
          clipPath: "inset(0 0 100% 0)",
        });
        clock = gsap.timeline({ paused: true });
        clock.to({}, { duration: 14 });
        [0, 4.5, 9].forEach((start, index) => {
          clock
            .fromTo(
              words[index],
              { opacity: 0, yPercent: 30, clipPath: "inset(0 0 100% 0)" },
              {
                opacity: 1,
                yPercent: 0,
                clipPath: "inset(0 0 0% 0)",
                duration: 0.5,
              },
              start + 0.15,
            )
            .to(
              words[index],
              { opacity: 0, yPercent: -15, duration: 0.45 },
              start + 1.6,
            );
        });
        gsap.fromTo(
          frame,
          { clipPath: "inset(12% 4%)" },
          {
            clipPath: "inset(0% 0%)",
            ease: "none",
            scrollTrigger: {
              id: "phase2936-film-entry",
              trigger: root,
              start: "top bottom",
              end: "top top",
              scrub: true,
            },
          },
        );
        ScrollTrigger.create({
          id: "phase2936-film-immersive",
          trigger: root,
          start: "top top",
          end: "bottom top",
          onToggle: (self) => {
            document.body.dataset.filmImmersive = String(self.isActive);
          },
        });
      }, root);
      return () => {
        clock = undefined;
        context.revert();
        delete document.body.dataset.filmImmersive;
      };
    },
  );
  owner.cleanup(() => {
    clearTimeout(timer);
    controls.hidden = external.hidden = true;
    setTicking(false);
    observer.disconnect();
    media.revert();
    video.pause();
    video.removeAttribute("src");
    video.load();
    status.textContent = "";
    delete root.dataset.ready;
    delete root.dataset.controls;
    delete root.dataset.playRejected;
    delete document.body.dataset.filmImmersive;
  });
  window.__phase2936Film = {
    get diagnostics() {
      return {
        shot: root.dataset.shot,
        playing: !video.paused,
        paused,
        source: video.getAttribute("src"),
        time: video.currentTime,
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
  return owner;
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
