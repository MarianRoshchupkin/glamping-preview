import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createOwnership } from "/glamping-preview/cinematic/legacy/controllers/ownership.mjs";

gsap.registerPlugin(ScrollTrigger);
function mount() {
  const owner = createOwnership();
  const header = document.querySelector(".cover-header");
  const headerMedia = gsap.matchMedia();
  headerMedia.add(
    { reduced: "(prefers-reduced-motion:reduce)", all: "all" },
    (conditions) => {
      const headerEvents = createOwnership();
      const context = gsap.context(() => {
        header.classList.add("motion-header");
        const fade = gsap.timeline({ paused: true }).fromTo(
          header,
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: conditions.conditions.reduced ? 0 : -28,
            duration: 1,
            ease: "power1.inOut",
          },
        );
        let trigger;
        const renderHeader = () => {
          const focused = header.contains(document.activeElement);
          const progress = focused
            ? 0
            : (trigger?.progress ?? Math.min(1, scrollY / 200));
          fade.progress(progress);
          header.inert = progress >= 1;
          header.setAttribute("aria-hidden", String(progress >= 1));
        };
        trigger = ScrollTrigger.create({
          id: "phase2938-header",
          start: 0,
          end: 200,
          onUpdate: renderHeader,
          onRefresh: renderHeader,
        });
        headerEvents.listen(header, "focusin", renderHeader);
        headerEvents.listen(header, "focusout", () =>
          queueMicrotask(() => {
            if (owner.alive) renderHeader();
          }),
        );
        renderHeader();
      }, header);
      return () => {
        headerEvents.dispose();
        context.revert();
        header.classList.remove("motion-header");
        header.inert = false;
        header.removeAttribute("aria-hidden");
      };
    },
  );
  owner.cleanup(() => headerMedia.revert());
  window.__phase2940Header = {
    dispose: () => owner.dispose(),
    remount() {
      owner.dispose();
      mount();
    },
  };
  owner.listen(window, "pagehide", (event) => {
    if (!event.persisted) owner.dispose();
  });
}
mount();
