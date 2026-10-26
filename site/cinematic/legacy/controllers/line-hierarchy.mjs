// Reuse only exact projected source segments; never infer a missing structural edge.
const ns = "http://www.w3.org/2000/svg";
const cross = (o, a, b) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
export function segments(d) {
  const parts = d.match(/[ML][-\d.]+[ ,]+[-\d.]+/g) ?? [];
  let previous;
  const result = [];
  for (const part of parts) {
    const point = part.slice(1).trim().split(/[ ,]+/).map(Number);
    if (part[0] === "L" && previous) result.push([previous, point]);
    previous = point;
  }
  return result;
}
function hull(points) {
  const sorted = [
    ...new Map(points.map((p) => [p.join(","), p])).values(),
  ].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (values) => {
    const h = [];
    for (const p of values) {
      while (h.length > 1 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop();
      h.push(p);
    }
    return h;
  };
  return [
    ...half(sorted).slice(0, -1),
    ...half(sorted.toReversed()).slice(0, -1),
  ];
}
function onHull([a, b], boundary) {
  return boundary.some((c, i) => {
    const d = boundary[(i + 1) % boundary.length],
      length = Math.hypot(d[0] - c[0], d[1] - c[1]);
    return (
      length > 0 &&
      Math.abs(cross(c, d, a)) / length < 0.04 &&
      Math.abs(cross(c, d, b)) / length < 0.04
    );
  });
}
export function addLineHierarchy(groups) {
  for (const group of groups) {
    const members = [...group.querySelectorAll("[data-component]")].map(
      (node) =>
        [...node.querySelectorAll("path")].flatMap((p) =>
          segments(p.getAttribute("d")),
        ),
    );
    const all = members.flat(),
      boundary = hull(all.flat()),
      structural = [],
      primary = [];
    for (const edges of members) {
      const silhouette = hull(edges.flat());
      for (const edge of edges) {
        if (onHull(edge, boundary)) primary.push(edge);
        else if (onHull(edge, silhouette)) structural.push(edge);
      }
    }
    for (const [role, edges] of [
      ["structural", structural],
      ["primary", primary],
    ]) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("class", `projected-${role}`);
      path.setAttribute(
        "d",
        edges.map(([a, b]) => `M${a.join(" ")}L${b.join(" ")}`).join(""),
      );
      path.dataset.derivedFrom = "exact-source-segments";
      group.append(path);
    }
  }
}
