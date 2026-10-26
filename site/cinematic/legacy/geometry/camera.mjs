// Existing Phase 29.2 camera and recovered model only; no documentary geometry.
const camera = [
  [-0.6739985346794128, 6.861309032046847e-8, -0.7387326955795288, -11.5],
  [-0.7387326955795288, 1.4005686921336746e-7, 0.6739985346794128, 24.5],
  [1.4970970596550615e-7, 1, -4.371138828673793e-8, 3],
];
export const PROJECTION_ANCHOR = [7.82, 6.92, 0];
const focalLength = (1280 * 48) / 36;
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const normalize = (v) => v.map((n) => n / Math.hypot(...v));
const columns = [0, 1, 2].map((i) => camera.map((row) => row[i]));
const relativeToCamera = (point) => point.map((v, i) => v - camera[i][3]);
const anchorCamera = columns.map((axis) =>
  dot(axis, relativeToCamera(PROJECTION_ANCHOR)),
);
const referenceDepth = -anchorCamera[2];
const initialYaw = Math.atan2(columns[0][1], columns[0][0]);
export const PROJECTED_ANCHOR = [
  640 + (focalLength * anchorCamera[0]) / referenceDepth,
  360 - (focalLength * anchorCamera[1]) / referenceDepth,
];

export function cameraProjector(progress) {
  const t = Math.min(1, Math.max(0, progress));
  if (t === 0) {
    return (point) => {
      const relative = relativeToCamera(point);
      const q = columns.map((axis) => dot(axis, relative));
      return [
        640 + (focalLength * q[0]) / -q[2],
        360 - (focalLength * q[1]) / -q[2],
      ];
    };
  }
  const yaw = initialYaw + (-Math.PI / 2 - initialYaw) * t;
  const right = normalize([
    Math.cos(yaw),
    Math.sin(yaw),
    columns[0][2] * (1 - t),
  ]);
  const nearUp = [columns[1][0] * (1 - t), columns[1][1] * (1 - t), 1];
  const overlap = dot(nearUp, right);
  const up = normalize(nearUp.map((v, i) => v - overlap * right[i]));
  const back = [
    right[1] * up[2] - right[2] * up[1],
    right[2] * up[0] - right[0] * up[2],
    right[0] * up[1] - right[1] * up[0],
  ];
  return (point) => {
    const relative = point.map((v, i) => v - PROJECTION_ANCHOR[i]);
    const q = [right, up, back].map(
      (axis, i) => dot(axis, relative) + anchorCamera[i],
    );
    const depth = -q[2] * (1 - t) + referenceDepth * t;
    return [
      640 + (focalLength * q[0]) / depth,
      360 - (focalLength * q[1]) / depth,
    ];
  };
}

export const cameraProject = (point, progress) =>
  cameraProjector(progress)(point);
