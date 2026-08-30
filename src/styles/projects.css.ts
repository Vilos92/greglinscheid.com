import {style} from '@vanilla-extract/css';

import {media, touchTargetMin} from './breakpoints';
import {palette} from './tokens';

/*
 * Styles.
 */

export const projectList = style({
  margin: '0 0 1.25em',
  paddingLeft: '1.5em'
});

export const projectName = style({
  fontWeight: 600,
  '@media': {
    [media.coarsePointer]: {
      display: 'inline-block',
      padding: '0.25rem 0',
      minHeight: touchTargetMin
    }
  }
});

export const sectionLead = style({
  color: palette.textMuted
});
