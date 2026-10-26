import { groupPoseAt, posedPoint, mix } from "./motion-math.mjs";
import { cameraProjector } from "./camera.mjs";
export const groups = ["roof", "walls", "openings", "floors", "base"];
export function decodeProjection(source) {
  if (
    source?.schema !== "phase2917-xyz-v1" ||
    source.samples !== 21 ||
    source.members?.length !== 217 ||
    source.topology?.length !== 12 ||
    source.unconfirmed?.length !== 16 ||
    JSON.stringify(source.groups) !== JSON.stringify(groups)
  )
    throw new Error("Unexpected projection schema");
  for (const edge of source.topology)
    if (
      !Array.isArray(edge) ||
      edge.length !== 2 ||
      !edge.every((v) => Number.isInteger(v) && v >= 0 && v < 8)
    )
      throw new Error("Invalid projection edge topology");
  let start = 0;
  const ids = new Set();
  const members = source.members.map((entry) => {
    if (!Array.isArray(entry) || entry.length !== 5)
      throw new Error("Invalid projection member");
    const [id, group, xy, xyz, mask] = entry;
    if (
      typeof id !== "string" ||
      ids.has(id) ||
      source.unconfirmed.includes(id) ||
      !Number.isInteger(group) ||
      !groups[group] ||
      !Array.isArray(xy) ||
      xy.length !== 16 ||
      !Array.isArray(xyz) ||
      xyz.length !== 24 ||
      ![...xy, ...xyz].every(Number.isFinite) ||
      !Number.isInteger(mask) ||
      mask < 0 ||
      mask > 4095
    )
      throw new Error("Invalid recovered component");
    ids.add(id);
    const member = {
      id,
      group: groups[group],
      start,
      count: 8,
      xy: Array.from({ length: 8 }, (_, i) => xy.slice(i * 2, i * 2 + 2)),
      xyz: Array.from({ length: 8 }, (_, i) => xyz.slice(i * 3, i * 3 + 3)),
      edges: source.topology.map(([a, b], i) => [a, b, (mask >> i) & 1]),
    };
    start += 8;
    return member;
  });
  const metadata = {
    samples: 21,
    vertexCount: start,
    edges: members.length * 12,
    members,
    unconfirmed: source.unconfirmed,
    sourceSha256: source.sourceSha256,
  };
  const zero = cameraProjector(0);
  const corrections = members.map((m) =>
    m.xyz.map((p, vertex) => {
      const projected = zero(p);
      return m.xy[vertex].map((v, a) => v - projected[a]);
    }),
  );
  const values = new Float64Array(metadata.samples * metadata.vertexCount * 2);
  for (let frame = 0; frame < metadata.samples; frame++) {
    const q = frame / (metadata.samples - 1),
      project = cameraProjector(q);
    for (const [index, member] of members.entries())
      for (const [vertex, point] of member.xyz.entries()) {
        const projected =
          frame === 0
            ? member.xy[vertex]
            : project(point).map(
                (v, a) => v + corrections[index][vertex][a] * (1 - q),
              );
        const offset =
          (frame * metadata.vertexCount + member.start + vertex) * 2;
        values[offset] = projected[0];
        values[offset + 1] = projected[1];
      }
  }
  return { metadata, values };
}
export function framePoint(data, frame, vertex) {
  const i = (frame * data.metadata.vertexCount + vertex) * 2;
  return [data.values[i], data.values[i + 1]];
}
export function fitFinal(data, box) {
  const start = (data.metadata.samples - 1) * data.metadata.vertexCount * 2;
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (let i = start; i < data.values.length; i += 2) {
    left = Math.min(left, data.values[i]);
    right = Math.max(right, data.values[i]);
    top = Math.min(top, data.values[i + 1]);
    bottom = Math.max(bottom, data.values[i + 1]);
  }
  const scale = Math.min(box[2] / (right - left), box[3] / (bottom - top));
  if (!Number.isFinite(scale) || scale <= 0)
    throw new Error("Invalid target fit");
  return {
    scale,
    tx: box[0] + box[2] / 2 - ((left + right) * scale) / 2,
    ty: box[1] + box[3] / 2 - ((top + bottom) * scale) / 2,
  };
}
const matrixPoint = (p, m) => [
  m.a * p[0] + m.c * p[1] + m.e,
  m.b * p[0] + m.d * p[1] + m.f,
];
const round = (v) => Math.round(v * 100) / 100;
const line = (a, b) =>
  `M${round(a[0])} ${round(a[1])}L${round(b[0])} ${round(b[1])}`;
export function buildBuckets(
  data,
  { sourceMatrix, targetMatrix, compact = false, variant = "sheet" },
) {
  const { samples, members } = data.metadata;
  const poses = Object.fromEntries(
    groups.map((group) => [group, groupPoseAt(0.64, group, variant, compact)]),
  );
  const buckets = groups.flatMap((group) =>
    [false, true].map((hidden) => ({ group, hidden, values: [], edgeIds: [] })),
  );
  for (let frame = 0; frame < samples; frame++) {
    const q = frame / (samples - 1);
    const affine = Object.fromEntries(
      ["a", "b", "c", "d", "e", "f"].map((key) => [
        key,
        mix(sourceMatrix[key], targetMatrix[key], q),
      ]),
    );
    const collapse = Object.fromEntries(
      groups.map((group) => [
        group,
        {
          x: poses[group].x * (1 - q),
          y: poses[group].y * (1 - q),
          scale: mix(poses[group].scale, 1, q),
        },
      ]),
    );
    const fragments = buckets.map(() => []);
    for (const member of members) {
      const points = Array.from({ length: member.count }, (_, vertex) =>
        matrixPoint(
          posedPoint(
            framePoint(data, frame, member.start + vertex),
            collapse[member.group],
          ),
          affine,
        ),
      );
      for (const [index, [a, b, hidden]] of member.edges.entries()) {
        const bucket =
          groups.indexOf(member.group) * 2 + Number(Boolean(hidden));
        fragments[bucket].push(line(points[a], points[b]));
        if (frame === 0)
          buckets[bucket].edgeIds.push(
            `${member.id}:e${String(index).padStart(4, "0")}`,
          );
      }
    }
    buckets.forEach((bucket, i) => bucket.values.push(fragments[i].join("")));
  }
  return buckets;
}
