import { posedPoint } from "./motion-math.mjs";

const namespace = "http://www.w3.org/2000/svg";
const groupAlias = { joists: "floors" };
const tickOffsets = {
  roof: [10, -10],
  base: [0, -20],
  walls: [-12, -10],
  openings: [-12, 8],
  joists: [12, 26],
};

// Five field positions and one compact legend, rather than a general label solver.
export function createCallouts(scene, stage, geometry, annotations, paths) {
  const leaders = scene.querySelector(".annotation-leaders");
  const markers = annotations.map((label, index) => {
    const marker = document.createElementNS(namespace, "text");
    marker.classList.add("callout-marker");
    marker.textContent = String(index + 1).padStart(2, "0");
    marker.dataset.sourceGroup = label.dataset.sourceGroup;
    marker.setAttribute("aria-hidden", "true");
    leaders.append(marker);
    return marker;
  });
  let measured = [],
    compact = false,
    offsets = {};

  function measure() {
    const bounds = stage.getBoundingClientRect();
    const matrix = geometry.getScreenCTM();
    if (!matrix) return;
    compact = matchMedia("(max-width:1000px)").matches;
    leaders.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    measured = annotations.map((label, index) => {
      const [ax, ay] = label.dataset.anchor.split(",").map(Number);
      const box = label.getBoundingClientRect();
      const transform = new DOMMatrix(getComputedStyle(label).transform);
      const left = box.left - bounds.left - transform.m41;
      const top = box.top - bounds.top - transform.m42;
      const labelBox = {
        left,
        top,
        right: left + box.width,
        bottom: top + box.height,
      };
      const source = label.dataset.sourceGroup;
      const gap = 12;
      let end, elbow;
      if (source === "walls" || source === "base") {
        end = [labelBox.right + gap, top + box.height / 2];
        elbow = [end[0] + 30, end[1]];
      } else {
        end = [left - gap, top + box.height / 2];
        elbow = [end[0] - 30, end[1]];
      }
      paths[index].dataset.sourceAnchor = `${ax},${ay}`;
      paths[index].dataset.calloutIndex = String(index + 1);
      return {
        ax,
        ay,
        source,
        labelBox,
        end,
        elbow,
        matrix: {
          a: matrix.a,
          b: matrix.b,
          c: matrix.c,
          d: matrix.d,
          e: matrix.e - bounds.left,
          f: matrix.f - bounds.top,
        },
      };
    });
    update(offsets);
  }

  function update(groupOffsets) {
    offsets = groupOffsets;
    const snapshots = measured.map((item, index) => {
      const { ax, ay, source, matrix, end, elbow } = item;
      const pose = offsets[groupAlias[source] ?? source] ?? {
        x: 0,
        y: 0,
        scale: 1,
      };
      const [px, py] = posedPoint([ax, ay], pose);
      const anchor = [
        px * matrix.a + py * matrix.c + matrix.e,
        px * matrix.b + py * matrix.d + matrix.f,
      ];
      const [dx, dy] = tickOffsets[source];
      const tick = [
        source === "base" ? Math.max(28, anchor[0] + dx) : anchor[0] + dx,
        anchor[1] + dy,
      ];
      const points = compact ? [tick, anchor] : [end, elbow, anchor];
      paths[index].setAttribute(
        "d",
        points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(""),
      );
      markers[index].setAttribute("x", tick[0] + (dx > 0 ? 3 : -3));
      markers[index].setAttribute("y", tick[1] + (dy > 0 ? 5 : -3));
      markers[index].setAttribute("text-anchor", dx > 0 ? "start" : "end");
      markers[index].style.opacity = annotations[index].style.opacity || "0";
      return {
        source,
        sourceMember: annotations[index].dataset.sourceMember,
        sourceAnchor: [ax, ay],
        anchor,
        points,
        label: item.labelBox,
        compact,
      };
    });
    // Real stage-pixel geometry is also the input to the browser collision check.
    scene.__calloutGeometry = snapshots;
  }
  return { measure, update };
}
