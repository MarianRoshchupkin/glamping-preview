export const clamp = (value) => Math.max(0, Math.min(1, value));
export const range = (value, start, end) =>
  clamp((value - start) / (end - start));
// C2 endpoints: position, velocity and acceleration join the stationary holds.
export const smooth = (value) => value ** 3 * (value * (value * 6 - 15) + 10);
export const mix = (a, b, p) => a + (b - a) * p;
export const xrayAt = (progress) => range(progress, 0.32, 0.84);
export const separationAt = (progress) => smooth(range(progress, 0.36, 0.6));
export const SPREADS = [1.8, 2.4, 2.8];
export const resolveSpread = (value) =>
  SPREADS.includes(Number(value)) ? Number(value) : 2.4;
export const POSES = {
  sheet: {
    roof: {
      x: -207.1351487885072,
      y: -220.87580709996178,
      scale: 0.78,
    },
    base: {
      x: -372.0099115509605,
      y: 166.254145,
      scale: 0.78,
    },
    walls: {
      x: -497.62582906661396,
      y: 71.73906090415517,
      scale: 0.78,
    },
    openings: {
      x: 392.36702928695337,
      y: -75.90524610160458,
      scale: 0.78,
    },
    floors: {
      x: 441.1843382842514,
      y: 133.74780640245564,
      scale: 0.78,
    },
  },
  mobile: {
    roof: {
      x: -88.61331511861385,
      y: -589.7525139842137,
      scale: 0.7,
    },
    base: {
      x: -52.54651983778069,
      y: 519.7706807682365,
      scale: 0.7,
    },
    walls: {
      x: -263.3389221564528,
      y: -293.37429216849125,
      scale: 0.7,
    },
    openings: {
      x: 101.3642205047729,
      y: 100.0110403521951,
      scale: 0.7,
    },
    floors: {
      x: -108.1389252082106,
      y: 313.29014495032396,
      scale: 0.7,
    },
  },
};
export const groupCues = {
  roof: [0.36, 0.54],
  walls: [0.38, 0.565],
  openings: [0.395, 0.58],
  floors: [0.42, 0.6],
  base: [0.43, 0.6],
};
// Separate from the volume first, then settle into its architectural field.
const routes = {
  roof: [
    [0.15, 1],
    [0, 1],
  ],
  walls: [
    [0, 0.8],
    [0.2, 1],
  ],
  openings: [
    [0, 0.8],
    [0.2, 1],
  ],
  floors: [
    [0, 1],
    [0.2, 1],
  ],
  base: [
    [0, 0.8],
    [0.15, 1],
  ],
};
export function groupPoseAt(
  progress,
  group,
  variant = "sheet",
  mobile = false,
) {
  const target = POSES[mobile ? "mobile" : "sheet"][group];
  const q = range(progress, ...groupCues[group]);
  const [horizontal, vertical] = routes[group];
  return {
    x: target.x * smooth(range(q, ...horizontal)) || 0,
    y: target.y * smooth(range(q, ...vertical)) || 0,
    scale: mix(
      1,
      target.scale * (variant === "tablet" ? 0.84 : 1),
      separationAt(progress),
    ),
  };
}
export const posedPoint = (point, pose) => [
  640 + (point[0] - 640 + pose.x) * pose.scale,
  430 + (point[1] - 430 + pose.y) * pose.scale,
];
export function stateAt(progress) {
  const p = clamp(progress);
  return {
    progress: p,
    blue: smooth(range(p, 0.12, 0.32)),
    paper: smooth(range(p, 0.76, 0.91)),
    interior: smooth(range(p, 0.74, 0.88)),
    handoff: smooth(range(p, 0.85, 0.96)),
    stage: p < 0.33 ? 0 : p < 0.72 ? 1 : 2,
  };
}
export function sheetAt(progress) {
  const p = clamp(progress),
    leave = 1 - smooth(range(p, 0.69, 0.76));
  return {
    working: smooth(range(p, 0.29, 0.34)) * leave,
    frame: smooth(range(p, 0.12, 0.255)),
    detail: smooth(range(p, 0.3, 0.35)) * leave,
    title: smooth(range(p, 0.26, 0.355)) * leave,
    footer: smooth(range(p, 0.48, 0.6)) * leave,
    transfer: smooth(range(p, 0.7, 0.86)),
    borderExit: 1 - smooth(range(p, 0.97, 1)),
  };
}
export function calloutAt(progress, index) {
  const group = ["roof", "base", "walls", "openings", "floors"][index];
  const [start, end] = groupCues[group];
  const duration = end - start;
  const leave = 1 - smooth(range(progress, 0.69, 0.76));
  return {
    line:
      smooth(range(progress, start + duration * 0.35, start + duration * 0.6)) *
      leave,
    text: smooth(range(progress, start + duration * 0.7, end + 0.015)) * leave,
  };
}

// Switch pen polarity at equal black/white contrast; never fade through the surface luminance.
export const registrationInkAt = (paper) =>
  paper < 0.1666362259
    ? [255, 255, 255]
    : [38, 61, 71].map((value) => value * smooth(range(paper, 0.6, 1)));
