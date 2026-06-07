/*
 * Types.
 */

export type ProjectDetailPart =
  | {kind: 'text'; value: string}
  | {kind: 'link'; href: string; label: string}
  | {kind: 'code'; value: string};

export type ProjectDetail = ProjectDetailPart | {kind: 'line'; parts: readonly ProjectDetailPart[]};

export type Project = {
  name: string;
  href: string;
  details: readonly ProjectDetail[];
};

/*
 * Constants.
 */

export const workspaceTools: readonly Project[] = [
  {
    name: 'dotfiles',
    href: 'https://github.com/Vilos92/dotfiles',
    details: [{kind: 'text', value: 'My configuration files for various tools.'}]
  },
  {
    name: 'gdex',
    href: 'https://github.com/Vilos92/gdex',
    details: [
      {
        kind: 'line',
        parts: [
          {kind: 'text', value: 'A desktop GUI for the '},
          {kind: 'link', href: 'https://dex.rip/', label: 'dex'},
          {kind: 'text', value: ' task tracker.'}
        ]
      }
    ]
  }
];

export const activeProjects: readonly Project[] = [
  {
    name: 'MilkTea',
    href: 'https://milktea.ink',
    details: [
      {
        kind: 'text',
        value:
          'An audio visualizer that supports multiple audio sources, and recording audio + visual output to a video file.'
      }
    ]
  },
  {
    name: 'copyparty-tunnel',
    href: 'https://github.com/Vilos92/copyparty-tunnel',
    details: [
      {
        kind: 'line',
        parts: [
          {kind: 'text', value: 'A '},
          {kind: 'code', value: 'Dockerfile'},
          {kind: 'text', value: ' to simplify running a '},
          {kind: 'code', value: 'copyparty'},
          {kind: 'text', value: ' instance that is exposed via Cloudflare Tunnel.'}
        ]
      }
    ]
  },
  {
    name: 'milo-engine',
    href: 'https://milo-engine.vercel.app/?dev',
    details: [{kind: 'text', value: 'An experiment in web animations and games.'}]
  },
  {
    name: 'typerion.dev',
    href: 'https://typerion.dev',
    details: [
      {
        kind: 'text',
        value: 'A Typescript notebook for developing, prototyping, and sharing software.'
      },
      {kind: 'text', value: 'No longer hosted.'},
      {
        kind: 'link',
        href: 'https://github.com/Vilos92/typerion',
        label: 'github.com/Vilos92/typerion'
      },
      {
        kind: 'line',
        parts: [
          {kind: 'text', value: 'npm package: '},
          {kind: 'link', href: 'https://www.npmjs.com/package/typerion', label: 'typerion'}
        ]
      }
    ]
  },
  {
    name: 'greglinscheid.com',
    href: 'https://github.com/Vilos92/greglinscheid.com',
    details: [
      {kind: 'text', value: "You're looking at it now."},
      {
        kind: 'link',
        href: 'https://github.com/Vilos92/greglinscheid.com',
        label: 'github.com/Vilos92/greglinscheid.com'
      }
    ]
  }
];

export const olderProjects: readonly Project[] = [
  {
    name: 'media-controls.nvim',
    href: 'https://github.com/Vilos92/media-controls.nvim',
    details: [
      {kind: 'text', value: 'Media control bindings and status listener for nvim.'},
      {kind: 'text', value: 'No longer maintained. Pre-requisites are now deprecated.'}
    ]
  },
  {
    name: 'grueplan.com',
    href: 'https://github.com/Vilos92/balboa',
    details: [
      {kind: 'text', value: 'A social event planning web application.'},
      {kind: 'text', value: 'No longer hosted.'},
      {kind: 'link', href: 'https://github.com/Vilos92/balboa', label: 'github.com/Vilos92/balboa'}
    ]
  },
  {
    name: 'Space Shooter',
    href: 'https://catfish-in-space-vilos92.vercel.app/',
    details: [
      {
        kind: 'text',
        value:
          'Experimenting with the web canvas, viewport + parallax computations, spatial audio, and physics-based gameplay.'
      },
      {
        kind: 'link',
        href: 'https://github.com/Vilos92/catfish-in-space',
        label: 'github.com/Vilos92/catfish-in-space'
      }
    ]
  },
  {
    name: 'Word Squared',
    href: 'https://word-squared.vercel.app/',
    details: [
      {kind: 'text', value: 'Word game where 4 sides must be solved to succeed.'},
      {
        kind: 'text',
        value: 'Hints are given for all sides as guesses are made for any one side.'
      }
    ]
  }
];
