import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";
gsap.registerPlugin(ScrollTrigger);

function mount() {
  const owner = createOwnership();
  const root = document.querySelector("#origins");
  const atlas = document.querySelector("#families .atlas44-index");
  const engineering = document.querySelector(".engineering-proof");
  const word = root.querySelector(".origins45-word");
  const letters = [...root.querySelectorAll(".origins48-letter")];
  const steps = [...root.querySelectorAll(".origins45-step")];
  const motionQuery = matchMedia("(prefers-reduced-motion:no-preference)");
  const desktopQuery = matchMedia("(min-width:701px) and (min-height:651px)");
  let context;
  let master;
  let fontReady = false;
  let fontError = false;

  async function enhance() {
    try {
      const family =
        document.documentElement.dataset.originsFont === "prata"
          ? "OriginsPrata"
          : "OriginsTenor";
      const fonts = await document.fonts.load(`400 100px ${family}`, "ИСТОКИ");
      await document.fonts.ready;
      if (!owner.alive) return;
      if (!fonts.length) throw new Error("Origins font unavailable");
      fontReady = true;
      render();
    } catch {
      reset();
      fontError = true;
      // Keep the semantic flow readable when the optional font enhancement cannot start.
    }
  }
  function reset() {
    context?.revert();
    context = undefined;
    master = undefined;
    atlas.inert = false;
    delete root.dataset.originsEnhanced;
    delete root.dataset.originsProgress;
  }
  function render() {
    reset();
    if (!fontReady || !motionQuery.matches) {
      ScrollTrigger.refresh();
      return;
    }
    const desktop = desktopQuery.matches;
    root.dataset.originsEnhanced = desktop ? "desktop" : "flow";
    context = gsap.context(() => {
      master = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "phase2948-origins-master",
          trigger: desktop ? root : word,
          start: desktop ? "top top" : "top 95%",
          end: desktop ? "bottom bottom" : "bottom 35%",
          scrub: true,
          onUpdate(trigger) {
            const inert = desktop && trigger.progress > 0.17;
            if (atlas.inert !== inert) atlas.inert = inert;
            root.dataset.originsProgress = trigger.progress.toFixed(4);
          },
        },
      });
      if (desktop) {
        master.fromTo(
          atlas.children,
          { opacity: 1 },
          { opacity: 0, duration: 0.13, stagger: 0.012 },
          0,
        );
        // Six existing spans share a single scroll clock; no timer or text replacement.
        master.fromTo(
          letters,
          { yPercent: 14, opacity: 0, clipPath: "inset(100% 0 0 0)" },
          {
            yPercent: 0,
            opacity: 1,
            clipPath: "inset(0% 0 0 0)",
            duration: 0.115,
            stagger: 0.025,
            ease: "power2.out",
          },
          0.18,
        );
        master.fromTo(
          steps.slice(0, 2),
          { y: 12, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.1,
            stagger: 0.025,
            ease: "power1.out",
          },
          0.45,
        );
        master.fromTo(
          steps.slice(2),
          { y: 12, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.1,
            stagger: 0.025,
            ease: "power1.out",
          },
          0.59,
        );
        master.to([word, ...steps], { opacity: 0, duration: 0.16 }, 0.84);
        master.fromTo(
          engineering,
          { "--origins-engineering-entry": 0 },
          { "--origins-engineering-entry": 1, duration: 0.16 },
          0.82,
        );
      } else {
        // Flow content stays readable throughout; only the decorative word reveals.
        master.fromTo(
          letters,
          { yPercent: 8, opacity: 0, clipPath: "inset(100% 0 0 0)" },
          {
            yPercent: 0,
            opacity: 1,
            clipPath: "inset(0% 0 0 0)",
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out",
          },
          0,
        );
      }
    }, document.querySelector("#main"));
    // Re-measure adjacent scenes only when font/layout readiness changes geometry.
    ScrollTrigger.refresh();
  }
  owner.cleanup(reset);
  // Native owned listeners avoid retained MQL handlers in the bundled GSAP matchMedia.
  owner.listen(motionQuery, "change", render);
  owner.listen(desktopQuery, "change", render);
  owner.listen(window, "pagehide", (event) => {
    if (!event.persisted) owner.dispose();
  });
  window.__phase2948Story = {
    get diagnostics() {
      const trigger = master?.scrollTrigger;
      return {
        start: trigger?.start,
        end: trigger?.end,
        progress: trigger?.progress,
        timelineProgress: master?.progress(),
        duration: master?.duration(),
        mode: root.dataset.originsEnhanced ?? "static",
        fontReady,
        fontError,
        atlasInert: atlas.inert,
      };
    },
    dispose: () => owner.dispose(),
    remount() {
      owner.dispose();
      mount();
    },
  };
  enhance();
}
mount();
