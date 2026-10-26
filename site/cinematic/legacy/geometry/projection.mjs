import { range, smooth, mix } from "./motion-math.mjs";
import { decodeProjection, fitFinal, buildBuckets } from "./data.mjs";
const namespace = "http://www.w3.org/2000/svg";
const frameCount = 21;
export function createProjection(scene, lineGeometry) {
  const stage = scene.querySelector(".structural-stage");
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("class", "projection-motion");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.opacity = "0";
  stage.append(svg);
  const supported =
    typeof svg.pauseAnimations === "function" &&
    typeof svg.setCurrentTime === "function";
  const diagnostics = {
    ready: false,
    nativeSVGSeeking: supported,
    components: 217,
    excluded: 16,
    edgeCount: 2604,
    keyframes: frameCount,
    projection: 0,
    registered: false,
    loadCount: 0,
    measureCount: 0,
    modelPrecomputeMs: 0,
    measureMs: 0,
    parseMs: 0,
    runtimeProjectionComputations: 0,
    targetBounds: null,
    error: null,
    interpolationAudit: "checks/geometry-validation.json",
  };
  let data,
    loading,
    measureKey,
    lastProgress = 0,
    lastTime = -1,
    measured = false,
    disposed = false;
  let paths = [];
  let settle;
  const ready = new Promise((resolve) => {
    settle = resolve;
  });
  const controller = new AbortController();
  if (supported) svg.pauseAnimations();
  else {
    diagnostics.error =
      "Native SVG timeline seeking unavailable; static content retained";
    settle(diagnostics);
  }

  function measure() {
    if (!supported || !data || disposed) return;
    const started = performance.now();
    const bounds = stage.getBoundingClientRect();
    const source = lineGeometry.getScreenCTM();
    const targetSVG = scene.querySelector(".unified-main svg");
    const target = targetSVG?.getScreenCTM();
    if (!source || !target || !bounds.width || !bounds.height) return;
    const compact = matchMedia("(max-width:600px)").matches;
    const variant = innerWidth <= 1000 && !compact ? "tablet" : "sheet";
    const key = [
      bounds.width,
      bounds.height,
      compact,
      variant,
      ...[source, target].flatMap((matrix) => [
        matrix.a,
        matrix.b,
        matrix.c,
        matrix.d,
        matrix.e - bounds.left,
        matrix.f - bounds.top,
      ]),
    ].join(",");
    if (key === measureKey) return;
    const fit = fitFinal(data, [100, 210, 950, 535]);
    const sourceMatrix = {
      a: source.a,
      b: source.b,
      c: source.c,
      d: source.d,
      e: source.e - bounds.left,
      f: source.f - bounds.top,
    };
    const targetMatrix = {
      a: target.a * fit.scale,
      b: target.b * fit.scale,
      c: target.c * fit.scale,
      d: target.d * fit.scale,
      e: target.a * fit.tx + target.c * fit.ty + target.e - bounds.left,
      f: target.b * fit.tx + target.d * fit.ty + target.f - bounds.top,
    };
    const buckets = buildBuckets(data, {
      sourceMatrix,
      targetMatrix,
      compact,
      variant,
    });
    const fragment = document.createDocumentFragment();
    const keyTimes = Array.from(
      { length: frameCount },
      (_, i) => i / (frameCount - 1),
    ).join(";");
    paths = buckets.map((bucket) => {
      const node = document.createElementNS(namespace, "path");
      node.dataset.projectionGroup = bucket.group;
      node.dataset.sourceVisibility = bucket.hidden ? "hidden" : "visible";
      node.dataset.edgeIds = bucket.edgeIds.join(" ");
      for (const [key, value] of Object.entries({
        d: bucket.values[0],
        fill: "none",
        stroke: "currentColor",
        "vector-effect": "non-scaling-stroke",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }))
        node.setAttribute(key, value);
      const animation = document.createElementNS(namespace, "animate");
      for (const [key, value] of Object.entries({
        attributeName: "d",
        values: bucket.values.join(";"),
        keyTimes,
        dur: "1s",
        begin: "0s",
        fill: "freeze",
        calcMode: "linear",
      }))
        animation.setAttribute(key, value);
      node.append(animation);
      fragment.append(node);
      return { node, hidden: bucket.hidden };
    });
    svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    svg.replaceChildren(fragment);
    svg.pauseAnimations();
    lastTime = -1;
    measured = true;
    diagnostics.ready = true;
    diagnostics.measureCount++;
    measureKey = key;
    diagnostics.measureMs = performance.now() - started;
    diagnostics.targetBounds = {
      left: target.a * 100 + target.e - bounds.left,
      top: target.d * 210 + target.f - bounds.top,
      width: target.a * 950,
      height: target.d * 535,
    };
    render(lastProgress);
    settle(diagnostics);
  }
  function render(progress) {
    lastProgress = progress;
    if (!data && progress >= 0.24) prepare();
    if (!measured || disposed) return;
    const q = smooth(range(progress, 0.57, 0.76));
    diagnostics.projection = q;
    diagnostics.registered = q === 1;
    const dedup = smooth(range(progress, 0.76, 0.8));
    const leave = 1 - smooth(range(progress, 0.88, 0.945));
    svg.style.opacity = progress < 0.57 ? "0" : String((1 - dedup) * leave);
    if (lastTime !== q) {
      svg.setCurrentTime(q);
      lastTime = q;
    }
    for (const { node, hidden } of paths) {
      const consolidation = smooth(range(q, 0.8, 0.94));
      const sourceInk = hidden ? 0.24 : 0.88;
      node.style.strokeWidth = String(mix(hidden ? 0.5 : 0.78, 0.65, q));
      node.style.opacity = String(
        mix(sourceInk, 0.7, smooth(range(q, 0.75, 1))) *
          (1 - 0.5 * consolidation),
      );
      node.style.strokeDasharray = hidden
        ? `2 ${3 * (1 - smooth(range(q, 0.75, 1)))}`
        : "";
    }
  }
  async function prepare() {
    if (loading || data || !supported || disposed) return loading;
    diagnostics.loadCount++;
    loading = (async () => {
      try {
        const parsedAt = performance.now();
        const { default: source } = await import("./projection-data.mjs");
        if (disposed) return;
        diagnostics.parseMs = performance.now() - parsedAt;
        const precomputeAt = performance.now();
        data = decodeProjection(source);
        diagnostics.modelPrecomputeMs = performance.now() - precomputeAt;
        diagnostics.runtimeProjectionComputations =
          data.metadata.vertexCount * frameCount;
        measure();
      } catch (error) {
        if (disposed || error.name === "AbortError") return;
        diagnostics.error = error.message;
        svg.style.opacity = "0";
        settle(diagnostics);
      }
    })();
    return loading;
  }
  function reset() {
    lastProgress = 0;
    lastTime = -1;
    svg.style.opacity = "0";
    if (supported) {
      svg.pauseAnimations();
      svg.setCurrentTime(0);
    }
    diagnostics.projection = 0;
    diagnostics.registered = false;
  }
  function dispose() {
    disposed = true;
    controller.abort();
    reset();
    svg.remove();
    paths = [];
    data = undefined;
    diagnostics.ready = false;
  }
  return { measure, render, reset, dispose, prepare, diagnostics, ready };
}
