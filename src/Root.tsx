import React from 'react';
import {Composition} from 'remotion';
import {Demo} from './Demo';
import {Main, MAIN_DURATION_SEC} from './Main';
import {W, H, FPS} from './theme';
import {MapShot, iberiaDefaults, east1241Defaults} from './mongols/MapShot';

export const Root: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={Math.ceil(MAIN_DURATION_SEC * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="MapShot" component={MapShot} defaultProps={iberiaDefaults} durationInFrames={5 * FPS} fps={FPS} width={W} height={H} />
    <Composition id="East1241" component={MapShot} defaultProps={east1241Defaults} durationInFrames={5 * FPS} fps={FPS} width={W} height={H} />
    <Composition id="Demo" component={Demo} durationInFrames={15 * FPS} fps={FPS} width={W} height={H} />
  </>
);
