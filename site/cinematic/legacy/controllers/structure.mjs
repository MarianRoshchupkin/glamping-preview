import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  stateAt,
  calloutAt,
  xrayAt,
  separationAt,
  sheetAt,
  groupPoseAt,
  range,
  smooth,
  resolveSpread,
  circleAt,
  structureProgressAt,
} from "./motion-math.mjs";
import { createProjection } from "../geometry/projection.mjs";
import { addLineHierarchy } from "./line-hierarchy.mjs";
import { createCallouts } from "./callouts.mjs";
export function mountStructure(root, owner) {
  const previousGlobals = {
    gsap: window.gsap,
    ScrollTrigger: window.ScrollTrigger,
  };
  window.gsap = gsap;
  window.ScrollTrigger = ScrollTrigger;

  const scene = root.querySelector("#engineering");
  const stage = scene.querySelector(".structural-stage");
  const track = scene.querySelector(".structural-track");
  const field = scene.querySelector(".engineering-layer");
  const labels = [
    "Архитектурная форма",
    "Конструктивная схема",
    "Конструкция в проекции",
  ];
  const motionQuery = matchMedia(
    "(prefers-reduced-motion:no-preference) and (min-height:600px)",
  );
  const border = scene.querySelector(".sheet-frame");
  const borderLine = border.querySelector("rect");
  const sheetVariant = root.dataset.sheet;
  const spread = resolveSpread(root.dataset.spread);
  let sheetRect, circle;
  let current = stateAt(0),
    media,
    trigger,
    refreshRAF;
  const surface = scene.querySelector(".engineering-surface");
  const paperBase = scene.querySelector(".paper-base");
  const lineGeometry = scene.querySelector(".engineering-layer .line-geometry");
  const title = scene.querySelector(".engineering-title");
  const sheetDetails = [...scene.querySelectorAll(".sheet-detail")];
  const sheetFooter = scene.querySelector(".sheet-footer");
  function reveal(node, amount, distance = 0) {
    node.style.opacity = amount;
    node.style.transform = `translateY(${(1 - amount) * distance}px)`;
  }
  const openings = document.createElementNS("http://www.w3.org/2000/svg", "g");
  openings.dataset.structureGroup = "openings";
  lineGeometry.querySelector('[data-structure-group="walls"]').after(openings);
  openings.append(
    ...lineGeometry.querySelectorAll('[data-source-group="openings"]'),
  );
  const structureGroups = [
    ...scene.querySelectorAll(".line-geometry [data-structure-group]"),
  ];
  addLineHierarchy(structureGroups);
  const projection = createProjection(scene, lineGeometry);
  projection.ready.then(() => {
    if (trigger) render(trigger.progress);
  });
  const unified = scene.querySelector(".unified-sheet");
  const unifiedMain = unified.querySelector(".unified-main");
  const unifiedSecondary = [
    ...unified.querySelectorAll(
      ".unified-aux,.unified-axis,.unified-legend,.unified-footer,.unified-heading > p:last-child",
    ),
  ];
  const unifiedHeading = unified.querySelector(".unified-heading");
  const unrecovered = new Set([
    "p292-218",
    "p292-217",
    "p292-226",
    "p292-227",
    "p292-232",
    "p292-222",
    "p292-230",
    "p292-231",
    "p292-228",
    "p292-225",
    "p292-229",
    "p292-224",
    "p292-221",
    "p292-219",
    "p292-220",
    "p292-223",
  ]);
  const unresolvedMembers = [
    ...lineGeometry.querySelectorAll("[data-component]"),
  ].filter((node) => unrecovered.has(node.dataset.component));
  const hierarchyOverlays = [
    ...lineGeometry.querySelectorAll(
      ".projected-primary,.projected-structural,.dimension-lines",
    ),
  ];
  let groupOffsets = {};
  const leaders = scene.querySelector(".annotation-leaders");
  const annotations = [...scene.querySelectorAll(".annotation")];
  let lockedGroup = null,
    previewGroup = null,
    focusAvailable = false;
  const focusButtons = annotations.map((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "structural-focus";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-describedby", "focus-help");
    button.disabled = true;
    button.append(...label.childNodes);
    label.append(button);
    const group =
      label.dataset.sourceGroup === "joists"
        ? "floors"
        : label.dataset.sourceGroup;
    owner.listen(button, "pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      previewGroup = group;
      paintFocus();
    });
    owner.listen(button, "pointerleave", () => {
      previewGroup = null;
      paintFocus();
    });
    owner.listen(button, "focus", () => {
      previewGroup = group;
      paintFocus();
    });
    owner.listen(button, "blur", () => {
      previewGroup = null;
      paintFocus();
    });
    owner.listen(button, "click", () => {
      lockedGroup = lockedGroup === group ? null : group;
      previewGroup = null;
      paintFocus();
    });
    return button;
  });
  function paintFocus() {
    const selected = focusAvailable ? (lockedGroup ?? previewGroup) : null;
    stage.dataset.focusGroup = selected ?? "";
    structureGroups.forEach((node) => {
      node.style.opacity =
        selected && node.dataset.structureGroup !== selected ? 0.32 : 1;
      node.dataset.focused = String(selected === node.dataset.structureGroup);
    });
    focusButtons.forEach((button, i) => {
      const source = annotations[i].dataset.sourceGroup;
      const group = source === "joists" ? "floors" : source;
      button.setAttribute("aria-pressed", String(lockedGroup === group));
      button.classList.toggle("is-highlighted", selected === group);
    });
  }
  function syncFocus(available) {
    if (focusAvailable === available) return;
    focusAvailable = available;
    if (!available) {
      lockedGroup = previewGroup = null;
      if (focusButtons.includes(document.activeElement))
        document.activeElement.blur();
    }
    field.setAttribute("aria-hidden", String(!available));
    focusButtons.forEach((button) => {
      button.disabled = !available;
    });
    paintFocus();
  }
  function escapeFocus(event) {
    if (event.key !== "Escape" || !focusAvailable) return;
    lockedGroup = previewGroup = null;
    paintFocus();
  }
  owner.listen(document, "keydown", escapeFocus);
  const leaderPaths = annotations.map((label) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
    node.setAttribute("pathLength", "1");
    node.dataset.sourceMember = label.dataset.sourceMember;
    node.dataset.sourceGroup = label.dataset.sourceGroup;
    leaders.append(node);
    return node;
  });
  const callouts = createCallouts(
    scene,
    stage,
    lineGeometry,
    annotations,
    leaderPaths,
  );
  function measure() {
    const bounds = stage.getBoundingClientRect();
    leaders.setAttribute(
      "viewBox",
      `0 0 ${stage.clientWidth} ${stage.clientHeight}`,
    );

    const matrix = lineGeometry.getScreenCTM();
    const center = new DOMPoint(640, 430).matrixTransform(matrix);
    circle = circleAt(
      bounds.width,
      bounds.height,
      center.x - bounds.left,
      center.y - bounds.top,
    );
    callouts.measure();
    projection.measure();
    const inset = innerWidth <= 600 ? 12 : 28;
    sheetRect = {
      left: inset,
      top: inset,
      width: stage.clientWidth - inset * 2,
      height: stage.clientHeight - inset * 2,
    };
    updateLeaders();
  }
  function updateLeaders() {
    callouts.update(groupOffsets);
  }
  function render(scrollProgress) {
    const progress = structureProgressAt(scrollProgress, innerWidth <= 600);
    if (current.progress >= 0.999 && progress < 0.999) measure();
    const structural = Math.min(0.64, (progress * 0.64) / 0.52);
    const base = stateAt(structural);
    const registered = smooth(range(progress, 0.76, 0.82));
    const prepare = smooth(range(progress, 0.52, 0.57));
    current = {
      progress,
      blue: base.blue,
      paper: 0,
      interior: 0,
      handoff: 0,
      stage: progress < 0.26 ? 0 : progress < 0.76 ? 1 : 2,
    };
    const sheet = sheetAt(structural, sheetVariant);
    scene.dataset.progress = progress.toFixed(5);
    scene.dataset.drawingStage =
      progress < 0.52
        ? "exploded"
        : progress < 0.57
          ? "prepare"
          : progress < 0.76
            ? "projection"
            : progress < 0.82
              ? "registration"
              : "unified";
    const compact = innerWidth <= 600;
    groupOffsets = {};
    structureGroups.forEach((node) => {
      const pose = groupPoseAt(
        structural,
        node.dataset.structureGroup,
        innerWidth <= 1000 && !compact ? "tablet" : "sheet",
        compact,
        spread,
      );
      node.setAttribute(
        "transform",
        `translate(640 430) scale(${pose.scale}) translate(${pose.x - 640} ${pose.y - 430})`,
      );
      groupOffsets[node.dataset.structureGroup] = pose;
    });
    projection.render(progress);
    window.__phase2917 =
      window.__phase2915 =
      window.__phase299 =
        {
          progress,
          projection: projection.diagnostics.projection,
          projectionDiagnostics: projection.diagnostics,
          xray: xrayAt(structural),
          separation: separationAt(structural),
          sheetVariant,
          spread,
          sheet,
          blue: base.blue,
          circle,
          groups: groupOffsets,
          visibleFragments: 0,
          photoHandoff: false,
          sourceMembers: 233,
          confirmedMembers: 217,
          unconfirmedMembers: 16,
        };
    root.classList.toggle(
      "projection-ready",
      projection.diagnostics.ready && !projection.diagnostics.error,
    );
    for (const member of unresolvedMembers) member.style.opacity = 1 - prepare;
    hierarchyOverlays.forEach((node) => {
      if (progress > 0.52)
        node.style.opacity = String(
          (node.classList.contains("projected-structural")
            ? 0.55
            : node.classList.contains("dimension-lines")
              ? 0.12
              : 1) *
            (1 - prepare),
        );
      else node.style.opacity = "";
    });
    const hasProjection =
      projection.diagnostics.ready && !projection.diagnostics.error;
    const projectedOpacity = hasProjection
      ? smooth(range(progress, 0.76, 0.8))
      : smooth(range(progress, 0.57, 0.64));
    unified.style.opacity = "1";
    unifiedMain.style.opacity = String(projectedOpacity);
    unifiedHeading.style.opacity = String(smooth(range(progress, 0.54, 0.6)));
    for (const node of unifiedSecondary)
      node.style.opacity = String(registered);
    field.style.clipPath = `circle(${base.blue * circle.radius}px at ${circle.x}px ${circle.y}px)`;
    field.style.color = "#f4f5f1";
    paperBase.style.opacity = 1 - smooth(range(structural, 0.26, 0.34));
    surface.style.backgroundColor = "#123f71";
    surface.style.opacity = "1";
    lineGeometry.style.opacity = hasProjection
      ? progress < 0.57
        ? 1
        : 0
      : 1 - smooth(range(progress, 0.57, 0.64));

    annotations.forEach((node, i) => {
      const cue = calloutAt(structural, i, sheetVariant),
        leave = 1 - smooth(range(progress, 0.52, 0.57));
      reveal(node, cue.text * leave, 8);
      leaderPaths[i].style.opacity = cue.line * leave;
      leaderPaths[i].style.strokeDashoffset = 1 - cue.line * leave;
    });
    updateLeaders();
    const oldTextExit = 1 - smooth(range(progress, 0.52, 0.56));
    reveal(title, sheet.title * oldTextExit, 9);
    sheetDetails.forEach((node) =>
      reveal(
        node,
        (node.classList.contains("sheet-inner")
          ? sheet.working
          : sheet.detail) * oldTextExit,
        0,
      ),
    );
    reveal(sheetFooter, sheet.footer * oldTextExit, 5);
    const head = scene.querySelector(".stage-head"),
      headOpacity = 1 - smooth(range(structural, 0.08, 0.17));
    head.style.opacity = headOpacity;
    head.style.pointerEvents = headOpacity > 0 ? "auto" : "none";
    head.style.transform = `translateY(${-smooth(range(structural, 0.08, 0.17)) * 18}px)`;
    stage.classList.toggle("is-blue", base.blue > 0.45);
    const tail = 1 - smooth(range(progress, 0.54, 0.6));
    const foot = scene.querySelector(".stage-foot");
    foot.style.opacity = tail;
    foot.style.visibility = tail > 0 ? "visible" : "hidden";
    for (const [property, key] of [
      ["x", "left"],
      ["y", "top"],
      ["width", "width"],
      ["height", "height"],
    ])
      borderLine.setAttribute(property, sheetRect[key]);
    border.style.opacity = String(0.25 + 0.75 * sheet.frame);
    border.style.color = base.blue > 0.5 ? "#f4f5f1" : "#3a4245";
    borderLine.style.strokeDashoffset = 0;
    stage.style.pointerEvents = progress >= 0.57 ? "none" : "";
    syncFocus(progress >= 0.4875 && progress <= 0.55);
    scene.querySelector(".stage-label").textContent = labels[current.stage];
  }
  function reset() {
    projection.reset();
    trigger = null;
    lockedGroup = previewGroup = null;
    focusAvailable = false;
    root.classList.remove("motion-ready");
    stage.classList.remove("is-blue");
    scene
      .querySelectorAll("[style]")
      .forEach((el) => el.removeAttribute("style"));
    structureGroups.forEach((node) => {
      const { x, y, scale } = groupPoseAt(
        0.64,
        node.dataset.structureGroup,
        innerWidth > 600 && innerWidth <= 1000 ? "tablet" : "sheet",
        innerWidth <= 600,
      );
      node.setAttribute(
        "transform",
        `translate(640 430) scale(${scale}) translate(${x - 640} ${y - 430})`,
      );
    });
    for (const [key, value] of [
      ["x", "0.5"],
      ["y", "0.5"],
      ["width", "99.8%"],
      ["height", "99.8%"],
    ])
      borderLine.setAttribute(key, value);
    groupOffsets = {};
    window.__phase2917 =
      window.__phase2915 =
      window.__phase299 =
        {
          progress: 0,
          projection: 0,
          projectionDiagnostics: projection.diagnostics,
          xray: 0,
          separation: 0,
          sheetVariant,
          spread,
          groups: {},
          visibleFragments: 0,
          photoHandoff: false,
        };
    current = stateAt(0);
    scene.querySelector(".stage-label").textContent = labels[0];
    syncFocus(true);
  }
  function startMotion() {
    if (!gsap || !ScrollTrigger) {
      root.classList.remove("scene-capable");
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add(
      {
        normal: "(prefers-reduced-motion:no-preference)",
        tall: "(min-height:600px)",
        mobile: "(max-width:600px)",
      },
      (context) => {
        if (!context.conditions.normal || !context.conditions.tall) {
          reset();
          return;
        }
        const owned = gsap.context(() => {
          root.classList.add("motion-ready");
          measure();
          trigger = ScrollTrigger.create({
            id: "phase2917",
            trigger: track,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => render(self.progress),
            onRefresh: () => {
              measure();
              if (trigger) render(trigger.progress);
            },
          });
          render(trigger.progress);
        }, scene);
        const refresh = () => {
          cancelAnimationFrame(refreshRAF);
          refreshRAF = requestAnimationFrame(() => {
            if (trigger) trigger.refresh();
          });
        };
        const observer = new ResizeObserver(refresh);
        observer.observe(stage);
        return () => {
          observer.disconnect();
          cancelAnimationFrame(refreshRAF);
          owned.revert();
          reset();
        };
      },
    );
  }
  const onMotionChange = () =>
    root.classList.toggle("scene-capable", motionQuery.matches);
  owner.listen(motionQuery, "change", onMotionChange);
  owner.listen(window, "pagehide", () => {
    document.removeEventListener("keydown", escapeFocus);
    media?.revert();
    media = null;
    motionQuery.removeEventListener("change", onMotionChange);
  });
  owner.listen(window, "pageshow", (event) => {
    if (event.persisted) {
      owner.listen(document, "keydown", escapeFocus);
      owner.listen(motionQuery, "change", onMotionChange);
      startMotion();
    }
  });
  syncFocus(!motionQuery.matches);
  startMotion();

  return () => {
    media?.revert();
    projection.dispose();
    if (previousGlobals.gsap === undefined) delete window.gsap;
    else window.gsap = previousGlobals.gsap;
    if (previousGlobals.ScrollTrigger === undefined)
      delete window.ScrollTrigger;
    else window.ScrollTrigger = previousGlobals.ScrollTrigger;
    delete window.__phase2917;
    delete window.__phase2915;
    delete window.__phase299;
    cancelAnimationFrame(refreshRAF);
    root.classList.remove("motion-ready", "scene-capable", "projection-ready");
  };
}
