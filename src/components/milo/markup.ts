/*
 * Milo's artwork as a framework-agnostic SVG string. Any host can render Milo with
 * `container.innerHTML = renderMiloSvg(size)` followed by `startMilos()` from `./animate` -- no
 * framework required. The Astro component in this folder is one such thin shell.
 */

/*
 * Types.
 */

type WhiskerPoint = readonly number[];

/*
 * Constants.
 */

const palette = {
  furBase: '#908a84',
  furShadow: '#837d77',
  furDark: '#67625f',
  cream: '#d9c5ac',
  earRim: '#b99688',
  earInner: '#d1b9b1',
  muzzle: '#ffffff',
  muzzleShade: '#f4f4f4',
  irisGold: '#c9bc7d',
  irisBelly: '#dccf92',
  irisShade: '#8f8359',
  pupil: '#17150f',
  eyeOutline: '#1f1d1b',
  nosePink: '#e9d1d2',
  noseSheen: '#f2dfe0',
  noseRim: '#d9b3b6',
  nostril: '#86635e',
  noseTip: '#333130',
  mouthLine: '#dfdbd5',
  whisker: '#efedea',
  highlight: '#ffffff'
};

// One continuous outline around head and ears, used as the clip every fur layer renders inside.
// The sides read like the reference: round cheeks, a slight temple waist, then a flare to the
// ears.
const silhouettePath =
  'M 0 -46 C -8 -48 -16 -47 -22 -45 C -30 -58 -40 -74 -48 -84 C -54 -72 -56 -50 -56 -30 ' +
  'C -55.5 -25 -55 -21 -55 -16 C -57 -8 -60 -2 -60 6 C -57 36 -34 56 0 56 ' +
  'C 34 56 57 36 60 6 C 60 -2 57 -8 55 -16 C 55 -21 55.5 -25 56 -30 ' +
  'C 56 -50 54 -72 48 -84 C 40 -74 30 -58 22 -45 C 16 -47 8 -48 0 -46 Z';

// Whisker curves as [root, control1, control2, tip], rendered as filled slivers that taper from
// the root width to a point at the tip, like real hairs.
const cheekWhiskersLeft = [
  [
    [-16, 22],
    [-34, 16],
    [-54, 14],
    [-72, 16]
  ],
  [
    [-17, 27],
    [-36, 24],
    [-56, 24],
    [-75, 28]
  ],
  [
    [-18, 31],
    [-37, 31],
    [-56, 34],
    [-73, 40]
  ],
  [
    [-16, 35],
    [-34, 40],
    [-52, 45],
    [-68, 52]
  ],
  [
    [-14, 39],
    [-29, 45],
    [-44, 52],
    [-58, 60]
  ]
];

const browWhiskersLeft = [
  [
    [-28, -14],
    [-36, -23],
    [-40, -33],
    [-47, -44]
  ],
  [
    [-23, -16],
    [-29, -27],
    [-35, -35],
    [-39, -47]
  ],
  [
    [-18, -17],
    [-21, -28],
    [-25, -37],
    [-28, -49]
  ]
];

function mirrorWhiskers(whiskers: WhiskerPoint[][]): WhiskerPoint[][] {
  return whiskers.map(whisker => whisker.map(([x, y]) => [-x, y]));
}

/** Builds one path of filled slivers, each tapering from `baseWidth` at the root to a point. */
function computeWhiskerPath(whiskers: WhiskerPoint[][], baseWidth: number): string {
  const fmt = (x: number, y: number) => `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`;
  return whiskers
    .map(([root, c1, c2, tip]) => {
      const length = Math.hypot(c1[0] - root[0], c1[1] - root[1]) || 1;
      const nx = -(c1[1] - root[1]) / length;
      const ny = (c1[0] - root[0]) / length;
      const off = (point: WhiskerPoint, k: number) => fmt(point[0] + nx * k, point[1] + ny * k);
      const w = baseWidth / 2;
      return (
        `M ${off(root, w)} C ${off(c1, w * 0.66)} ${off(c2, w * 0.33)} ${fmt(tip[0], tip[1])} ` +
        `C ${off(c2, -w * 0.33)} ${off(c1, -w * 0.66)} ${off(root, -w)} Z`
      );
    })
    .join(' ');
}

const cheekWhiskersLeftPath = computeWhiskerPath(cheekWhiskersLeft, 1.7);
const cheekWhiskersRightPath = computeWhiskerPath(mirrorWhiskers(cheekWhiskersLeft), 1.7);
const browWhiskersLeftPath = computeWhiskerPath(browWhiskersLeft, 1.4);
const browWhiskersRightPath = computeWhiskerPath(mirrorWhiskers(browWhiskersLeft), 1.4);

/*
 * Markup.
 */

/** Renders Milo's complete SVG markup at the given square pixel size. */
export function renderMiloSvg(size: number): string {
  return `<svg
  data-milo
  width="${size}"
  height="${size}"
  viewBox="-110 -110 220 220"
  role="img"
  aria-label="Milo, a cat face that follows your cursor"
>
  <defs>
    <clipPath id="milo-face-clip">
      <path d="${silhouettePath}"></path>
    </clipPath>
    <!-- Almond clips keep the pupils inside the lids at full gaze deflection. -->
    <clipPath id="milo-eye-clip-left">
      <path
        d="M -11.3 -2.1 C -9.4 -7.5 -3.3 -10 2.6 -9 C 7.3 -8.1 10.8 -1.6 11.3 5.5 C 7.3 8.6 0.7 9 -4.7 6.9 C -8.6 5.3 -11.3 1.6 -11.3 -2.1 Z"
      ></path>
    </clipPath>
    <clipPath id="milo-eye-clip-right">
      <path
        d="M 11.3 -2.1 C 9.4 -7.5 3.3 -10 -2.6 -9 C -7.3 -8.1 -10.8 -1.6 -11.3 5.5 C -7.3 8.6 -0.7 9 4.7 6.9 C 8.6 5.3 11.3 1.6 11.3 -2.1 Z"
      ></path>
    </clipPath>
  </defs>

  <g data-milo-head>
    <g clip-path="url(#milo-face-clip)">
      <!-- Base fur: the skull surface, static inside the silhouette. -->
      <rect x="-80" y="-100" width="160" height="180" fill="${palette.furShadow}"></rect>

      <!-- Face plane: every marking painted on the face rides this group, which the script slides with
      the features (at a fraction of their travel) so the pattern turns with the head instead of
      staying glued to the skull. Shapes bleed past the silhouette so sliding never exposes a
      seam, and the patches near the skull dome sit low enough that a full deflection never shears
      them against it. -->
      <g data-milo-face>
        <!-- The coat, traced directly from the reference sticker: each subpath is a patch contour
        extracted from the image (lighter gray, cream, then dark gray over the mid-gray base), so
        placement, size, angle, and raggedness are the source's own. -->
        <path d="M 6.1 -41.8 L 9.3 -38.6 L 11.7 -38.9 L 4.5 -31.1 L 0.1 -32.5 L -1.5 -34.3 L -4 -33.9 L -7.2 -35.3 L -2.3 -35.7 L 6.1 -41.4 Z M 17.8 -32.8 L 17.4 -28.2 L 19.4 -27.1 L 17.4 -21 L 14.6 -22.1 L 12.6 -26.8 L 13.8 -31.4 L 15.4 -30.3 L 17.4 -32.5 Z M -12.4 -30.7 L -8.8 -27.8 L -6.8 -23.5 L -7.6 -19.6 L -10 -22.1 L -11.6 -19.2 L -13.6 -24.3 L -13.6 -28.5 L -12 -30.3 Z M 47.6 -9.2 L 48 4.9 L 42.4 -2.1 L 46.8 -5.6 L 47.6 -8.9 Z M -38.2 -6 L -37.4 1.5 L -35.4 2.3 L -36.2 5.9 L -39.4 3.9 L -39.8 0.8 L -41.4 -0.3 L -41.4 -2.8 L -38.6 -5.6 Z" fill="${palette.furBase}"></path>
        <path d="M 28.7 -28.9 L 28.7 -27.1 L 31.9 -26.4 L 31.5 -25.3 L 33.1 -26.4 L 36.7 -24.6 L 39.5 -25.7 L 39.1 -22.8 L 40.3 -21 L 43.6 -20.3 L 40.3 -17.8 L 39.1 -20 L 30.3 -24.3 L 31.1 -25.7 L 29.5 -24.6 L 27.9 -25.3 L 28.7 -28.5 Z M -32.6 -24.3 L -29.7 -23.2 L -29.7 -21 L -31.7 -21.7 L -32.6 -19.2 L -38.6 -18.5 L -33 -23.9 Z M 20.6 -17.8 L 19.4 -16.4 L 21 -14.2 L 20.6 -12.4 L 23.4 -12.1 L 20.2 -8.9 L 23.8 -8.1 L 30.7 -9.6 L 32.3 -7.8 L 31.1 -7.4 L 32.7 -6.7 L 21 -7.1 L 15 -3.1 L 21.4 -6 L 27.5 -5.6 L 29.1 -3.5 L 27.9 -3.1 L 28.3 -0.3 L 26.6 3.3 L 23 5.9 L 15.4 3.9 L 13.8 1.5 L 15 -3.1 L 13 0.1 L 11.3 10.9 L 8.9 4.9 L 10.5 -5.3 L 15 -6 L 17.4 -8.5 L 18.6 -15.3 L 20.2 -17.5 Z M -15.6 -16.7 L -12 -8.9 L -9.6 -7.1 L -8 -7.8 L -6.4 -6.7 L -4.8 -1.3 L -4.8 5.9 L -6.4 9.9 L -8.4 -1.3 L -11.2 -4.9 L -15.6 -7.4 L -20.9 -7.4 L -16.8 -9.2 L -17.7 -10.3 L -16.4 -11.4 L -18.1 -13.2 L -16 -13.9 L -15.6 -16.4 Z M -20.9 -6.4 L -14.8 -5.6 L -11.2 -3.1 L -9.6 -0.3 L -10.8 -0.3 L -10.4 3.9 L -15.2 5.4 L -21.3 4.4 L -23.7 1.5 L -23.7 -1.7 L -25.3 -1.7 L -24.5 -4.6 L -21.3 -6 Z M -27.7 -5.3 L -27.3 0.1 L -25.3 3.9 L -18.9 8.4 L -11.6 8.4 L -12.4 13 L -20.9 11.9 L -28.5 5.4 L -31.7 0.1 L -28.1 -4.9 Z M 33.5 -3.8 L 34.3 1.5 L 31.1 6.9 L 18.6 15.5 L 16.6 14.5 L 15.4 7.9 L 23 8.9 L 26.6 7.4 L 31.9 0.4 L 33.1 -3.5 Z M 43.6 6.4 L 44.8 10.4 L 46.8 9.9 L 46.8 15.5 L 34.3 18.5 L 40.3 13 L 39.1 11.9 L 43.2 6.9 Z M -39.8 7.4 L -38.2 11.9 L -33.8 11.9 L -30.5 16 L -35.8 14 L -37.8 17.5 L -39.4 17 L -42.2 11.4 L -39.8 7.9 Z M -26.1 19.5 L -26.1 22.6 L -21.3 24.1 L -22.5 26.1 L -19.3 28.1 L -20.1 30.2 L -33.4 31.2 L -39.8 24.6 L -34.6 24.1 L -30.1 27.6 L -28.1 23.6 L -30.1 23.1 L -30.1 21.1 L -26.5 20 Z M 35.1 20.5 L 37.1 20.5 L 35.5 23.6 L 40.7 23.1 L 41.1 24.6 L 43.2 24.6 L 41.5 26.6 L 43.2 27.1 L 36.7 30.7 L 22.2 30.7 L 25.4 30.2 L 31.5 22.1 L 34.7 21.1 Z M 27.1 31.2 L 36.7 31.7 L 38.3 33.2 L 35.1 33.7 L 34.7 37.2 L 25 34.7 L 23 31.7 L 26.6 31.7 Z M -30.1 31.7 L -20.5 31.7 L -22.1 35.2 L -27.7 36.2 L -31.7 32.2 L -30.5 32.2 Z" fill="${palette.cream}"></path>
        <path d="M 33.9 -51.1 L 25.4 -36.1 L 22.6 -36.4 L 22.6 -39.3 L 21.8 -36.8 L 14.6 -37.1 L 15.4 -41.4 L 14.2 -43.6 L 16.2 -42.5 L 17.8 -44.3 L 19.8 -43.2 L 22.2 -44.3 L 24.6 -43.6 L 33.5 -50.7 Z M -22.9 -47.5 L -16.4 -43.6 L -3.2 -40.4 L -12.4 -38.2 L -12.4 -33.6 L -17.3 -38.6 L -22.5 -47.2 Z M -0.3 -29.6 L 1.3 -26.4 L 4.5 -28.9 L 4.5 -21.4 L 7.7 -17.8 L 11.3 -18.5 L 7.3 -10.3 L 4.9 -12.4 L 4.1 -10.3 L 1.3 -15.7 L -4 -11.4 L -5.2 -20.3 L -2.3 -18.5 L -2.3 -29.3 L -1.1 -25.7 L -0.3 -29.3 Z M 46.4 -24.6 L 48.4 -16.4 L 47.2 -10.6 L 45.2 -13.2 L 46.4 -14.9 L 45.2 -14.9 L 44.8 -17.1 L 46 -24.3 Z M -38.2 -17.8 L -36.2 -14.9 L -33.8 -14.9 L -35 -12.8 L -32.6 -11.7 L -42.2 -6 L -41.4 -11.7 L -37.8 -14.2 L -38.2 -17.5 Z M 14.2 -17.1 L 17 -14.2 L 18.2 -14.6 L 17.4 -9.2 L 14.6 -6.4 L 14.2 -16.7 Z M 22.6 -17.1 L 24.2 -14.2 L 26.6 -14.9 L 26.2 -12.8 L 29.9 -10.3 L 21 -8.5 L 21.8 -11 L 23.8 -12.1 L 21.4 -12.4 L 23 -16.7 Z M -13.2 -16.7 L -11.2 -14.9 L -10 -15.7 L -7.2 -7.8 L -11.6 -8.9 L -13.2 -16.4 Z M -21.3 -15.3 L -18.5 -13.2 L -17.3 -9.6 L -21.7 -9.2 L -20.9 -10.3 L -24.1 -13.2 L -21.3 -12.8 L -20.9 -14.9 Z M -26.5 -6 L -35 -0.6 L -35.8 -4.9 L -26.9 -5.6 Z M 37.1 -0.6 L 36.3 4.9 L 27.5 18.5 L 25.8 17.5 L 24.2 19.5 L 19.8 17.5 L 19 15.5 L 30.7 7.9 L 37.1 -0.3 Z M -32.2 0.1 L -25.3 9.4 L -15.2 14 L -18.5 17 L -22.5 17.5 L -29.3 15 L -33 10.9 L -32.2 0.4 Z M -45 2.3 L -43.8 5.9 L -41.8 3.3 L -43 13 L -40.2 17.5 L -36.6 19.5 L -40.6 23.6 L -43.8 20.5 L -45.4 10.4 L -45 2.8 Z M 13 2.8 L 13.4 6.4 L 17.4 7.4 L 15 7.9 L 14.6 13.5 L 13 14.5 L 13 3.3 Z M -8.4 6.9 L -8 14.5 L -9.2 16 L -9.6 13.5 L -10.8 14.5 L -12 7.9 L -8.8 7.4 Z" fill="${palette.furDark}"></path>

        <!-- White blaze and muzzle: a narrow strip between the eyes that flares around the muzzle,
        extended past the chin so it stays seamless in motion. -->
        <path
          d="M -1.4 -13 C -2.6 -9 -3.8 -1.5 -6 6 C -9 14 -22 24 -26 32 C -30 42 -26 58 -14 66 C -8 70 8 70 14 66 C 26 58 30 42 26 32 C 22 24 9 14 6 6 C 4 -0.5 3.2 -5 3.2 -8.2 C 2 -8 1.4 -8.8 1.2 -9.6 C 0.6 -11 -0.4 -12.2 -1.4 -13 Z"
          fill="${palette.muzzle}"></path>
        <!-- Chin shading, a touch darker than the muzzle white like the reference. -->
        <path
          d="M -8 37.5 C -5 36 5 36.1 8 37.9 C 9.6 40 8.8 43 6 44.7 C 2 46.3 -3 46.2 -6.4 44.3 C -9 42.4 -9.4 39.5 -8 37.5 Z"
          fill="${palette.muzzleShade}"></path>

      </g>

      <!-- Ear interiors: pink pockets inset inside the silhouette ear cones, on their own gently-
      moving plane. Beneath them lies only the uniform crown gray (the splotch zone ends below
      their bottoms), so their slower slide can never shear a marking, and their small travel
      stays inside the cone frame, so the shift reads as the ears foreshortening. -->
      <g data-milo-ears>
        <path
          d="M -52 -38 C -52.5 -55 -51 -71 -47 -82 C -43 -75 -39.5 -68 -36.5 -61"
          stroke="${palette.cream}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"></path>
        <path
          d="M -25 -42 C -30 -54 -38 -69 -47 -82 C -51 -71 -52.5 -55 -52 -38 C -50.5 -34.5 -47.5 -32.5 -44 -31.5 C -42.5 -29.8 -40 -30.2 -39.5 -32 C -37 -31.2 -34.8 -32.8 -35 -34.8 C -32.2 -34.8 -30 -36.6 -30.8 -38.6 C -28.2 -39 -26 -40.6 -25 -42 Z"
          fill="${palette.earRim}"></path>
        <path
          d="M -29 -41 C -31.5 -46.5 -30.8 -49.5 -33.2 -53 C -35.6 -56.5 -35 -59.5 -37.6 -63 C -39.8 -66.5 -41.2 -71 -44 -76 C -46.5 -66 -47.5 -53 -47 -40 C -45.8 -37 -43.8 -35.8 -41.8 -36.2 C -40.8 -34.4 -38.8 -34.6 -38.2 -36.4 C -36.2 -36 -34.4 -37.2 -34.8 -39 C -32.6 -39 -30.6 -39.8 -29 -41 Z"
          fill="${palette.earInner}"></path>
        <path
          d="M -34 -50 L -41 -63 M -31 -40 L -38 -52"
          stroke="${palette.cream}"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"></path>
        <path
          d="M 52 -38 C 52.5 -55 51 -71 47 -82 C 43 -75 39.5 -68 36.5 -61"
          stroke="${palette.cream}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"></path>
        <path
          d="M 25 -42 C 30 -54 38 -69 47 -82 C 51 -71 52.5 -55 52 -38 C 50.5 -34.5 47.5 -32.5 44 -31.5 C 42.5 -29.8 40 -30.2 39.5 -32 C 37 -31.2 34.8 -32.8 35 -34.8 C 32.2 -34.8 30 -36.6 30.8 -38.6 C 28.2 -39 26 -40.6 25 -42 Z"
          fill="${palette.earRim}"></path>
        <path
          d="M 29 -41 C 31.5 -46.5 30.8 -49.5 33.2 -53 C 35.6 -56.5 35 -59.5 37.6 -63 C 39.8 -66.5 41.2 -71 44 -76 C 46.5 -66 47.5 -53 47 -40 C 45.8 -37 43.8 -35.8 41.8 -36.2 C 40.8 -34.4 38.8 -34.6 38.2 -36.4 C 36.2 -36 34.4 -37.2 34.8 -39 C 32.6 -39 30.6 -39.8 29 -41 Z"
          fill="${palette.earInner}"></path>
        <path
          d="M 34 -50 L 41 -63 M 31 -40 L 38 -52"
          stroke="${palette.cream}"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"></path>
      </g>
    </g>
  </g>

  <g data-milo-features>
    <!-- Brow whiskers. -->
    <path d="${browWhiskersLeftPath}" fill="${palette.whisker}"></path>
    <path d="${browWhiskersRightPath}" fill="${palette.whisker}"></path>

    <!-- Tan surrounds hugging each eye like the reference's goggle markings. They ride the features
    group so they stay glued to the eyes at any deflection. -->
    <path
      d="M -33 -4 C -32.5 -8 -29 -10.5 -25.5 -10.5 C -22 -13 -15.5 -13.5 -11 -7 C -8.5 -1.5 -9.5 6 -13 9.5 C -16.5 12.5 -22 13 -26 11.5 C -30 12.5 -33 9.5 -32.5 6 C -34 3 -34 -1 -33 -4 Z"
      fill="${palette.cream}"></path>
    <path
      d="M 33 -4 C 32.5 -8 29 -10.5 25.5 -10.5 C 22 -13 15.5 -13.5 11 -7 C 8.5 -1.5 9.5 6 13 9.5 C 16.5 12.5 22 13 26 11.5 C 30 12.5 33 9.5 32.5 6 C 34 3 34 -1 33 -4 Z"
      fill="${palette.cream}"></path>

    <!-- Eyes: wide almonds with an ~19-degree corner slant baked into the paths, inner corners dipping
    toward the blaze. Proportions started from measuring the reference (19x15 against a 118-unit
    head, centers 40 apart), then the whole construction was scaled up ~30% for presence with the
    measured inner-corner gap preserved. The pupil group slides further than the eye for a
    "looking at you" read. Highlights sit on the pupil edge, asymmetric per eye. -->
    <g transform="translate(-23 2)">
      <g data-milo-eye>
        <path d="M -11.3 -2.1 C -9.4 -7.5 -3.3 -10 2.6 -9 C 7.3 -8.1 10.8 -1.6 11.3 5.5 C 7.3 8.6 0.7 9 -4.7 6.9 C -8.6 5.3 -11.3 1.6 -11.3 -2.1 Z" fill="${palette.irisGold}"></path>
        <g clip-path="url(#milo-eye-clip-left)">
          <ellipse cx="-3.2" cy="2.6" rx="5.9" ry="4.2" fill="${palette.irisBelly}"></ellipse>
          <path
            d="M -8.2 -3.2 C -4.6 -7 2.2 -7.4 6.4 -4.8 C 1.8 -6.2 -4 -5.6 -8.2 -3.2 Z"
            fill="${palette.irisShade}"></path>
        </g>
        <path
          d="M -11.3 -2.1 C -9.4 -7.5 -3.3 -10 2.6 -9 C 7.3 -8.1 10.8 -1.6 11.3 5.5 C 7.3 8.6 0.7 9 -4.7 6.9 C -8.6 5.3 -11.3 1.6 -11.3 -2.1 Z"
          fill="none"
          stroke="${palette.eyeOutline}"
          stroke-width="2.8"
          stroke-linejoin="round"></path>
        <g data-milo-pupil clip-path="url(#milo-eye-clip-left)">
          <path
            d="M 0 -5.7 C 2.7 -5.7 3.9 -3 3.6 -0.3 C 3.4 2.5 1.8 4.6 0 5.6 C -1.8 4.6 -3.4 2.5 -3.6 -0.3 C -3.9 -3 -2.7 -5.7 0 -5.7 Z"
            fill="${palette.pupil}"></path>
          <circle cx="-2.3" cy="0.9" r="1.7" fill="${palette.highlight}"></circle>
        </g>
      </g>
    </g>
    <g transform="translate(23 2)">
      <g data-milo-eye>
        <path d="M 11.3 -2.1 C 9.4 -7.5 3.3 -10 -2.6 -9 C -7.3 -8.1 -10.8 -1.6 -11.3 5.5 C -7.3 8.6 -0.7 9 4.7 6.9 C 8.6 5.3 11.3 1.6 11.3 -2.1 Z" fill="${palette.irisGold}"></path>
        <g clip-path="url(#milo-eye-clip-right)">
          <ellipse cx="3.2" cy="2.6" rx="5.9" ry="4.2" fill="${palette.irisBelly}"></ellipse>
          <path
            d="M 8.2 -3.2 C 4.6 -7 -2.2 -7.4 -6.4 -4.8 C -1.8 -6.2 4 -5.6 8.2 -3.2 Z"
            fill="${palette.irisShade}"></path>
        </g>
        <path
          d="M 11.3 -2.1 C 9.4 -7.5 3.3 -10 -2.6 -9 C -7.3 -8.1 -10.8 -1.6 -11.3 5.5 C -7.3 8.6 -0.7 9 4.7 6.9 C 8.6 5.3 11.3 1.6 11.3 -2.1 Z"
          fill="none"
          stroke="${palette.eyeOutline}"
          stroke-width="2.8"
          stroke-linejoin="round"></path>
        <g data-milo-pupil clip-path="url(#milo-eye-clip-right)">
          <path
            d="M 0 -5.7 C 2.7 -5.7 3.9 -3 3.6 -0.3 C 3.4 2.5 1.8 4.6 0 5.6 C -1.8 4.6 -3.4 2.5 -3.6 -0.3 C -3.9 -3 -2.7 -5.7 0 -5.7 Z"
            fill="${palette.pupil}"></path>
          <circle cx="2.3" cy="-2.7" r="1.7" fill="${palette.highlight}"></circle>
        </g>
      </g>
    </g>

    <!-- Nose: a subtle off-white bridge above it, then the pink pad (sheen, thin nostril slits, dark
    tip), the mouth notch beneath, and soft muzzle mounds, giving a neutral cat mouth like the
    reference rather than a smile. -->
    <path
      d="M 0.3 5.8 C 1.6 7.8 3 10 4.6 12 C 5.8 13.4 6.6 14.6 7 15.4 C 4.4 15 1.6 14.8 -0.4 15 C -2.8 14.8 -5 15.2 -6.8 15.6 C -5.8 13.6 -4.4 11.6 -2.9 9.6 C -1.8 8.2 -0.8 6.8 0.3 5.8 Z"
      fill="${palette.muzzleShade}"></path>
    <path
      d="M -10 16 Q 0 13.5 10 16 Q 12.5 18.5 10.5 22.5 Q 6.5 28 0 29 Q -6.5 28 -10.5 22.5 Q -12.5 18.5 -10 16 Z"
      fill="${palette.nosePink}"
      stroke="${palette.noseRim}"
      stroke-width="1"></path>
    <path
      d="M -6 16.5 Q 0 15.2 6 16.5 Q 5.5 19.2 0 19.6 Q -5.5 19.2 -6 16.5 Z"
      fill="${palette.noseSheen}"></path>
    <path
      d="M -9.15 22.5 C -8.9 23.3 -8.3 24 -7.2 24.6"
      stroke="${palette.nostril}"
      stroke-width="2"
      stroke-linecap="round"
      fill="none"></path>
    <path
      d="M 9.15 22.5 C 8.9 23.3 8.3 24 7.2 24.6"
      stroke="${palette.nostril}"
      stroke-width="2"
      stroke-linecap="round"
      fill="none"></path>
    <path
      d="M -4.4 25.2 C -2.8 24.4 -1 24.8 0.4 24.4 C 2 24.1 3.4 24.7 4.2 25.5 C 4.5 26.9 3.6 28.5 2.2 29.6 C 1 30.5 -0.6 30.7 -1.8 30.1 C -3.3 29.3 -4.4 27.6 -4.4 25.2 Z"
      fill="${palette.noseTip}"></path>
    <path
      d="M -0.5 35.5 Q -9 40.5 -17.5 38 M 0.5 35.5 Q 9 40.5 17.5 38"
      stroke="${palette.mouthLine}"
      stroke-width="2"
      stroke-linecap="round"
      fill="none"></path>
    <path d="M -2.5 32.7 C -1.2 32.4 0.9 32.4 2.2 32.8 C 1.5 33.9 0.8 34.9 0.2 35.7 C -0.7 34.9 -1.8 33.8 -2.5 32.7 Z" fill="${palette.eyeOutline}"></path>

    <!-- Whiskers. -->
    <path d="${cheekWhiskersLeftPath}" fill="${palette.whisker}"></path>
    <path d="${cheekWhiskersRightPath}" fill="${palette.whisker}"></path>
  </g>
</svg>`;
}
