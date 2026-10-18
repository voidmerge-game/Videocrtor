import React from 'react';
import {Composition} from 'remotion';
import {Demo} from './Demo';
import {W, H, FPS} from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="Demo" component={Demo} durationInFrames={15 * FPS} fps={FPS} width={W} height={H} />
  </>
);
