// TODO: perhaps this should reside alongside '../reducer.ts'?

import { UMLModel } from '../../typings';
import { Actions } from '../actions';
import { MovingStreamer } from '../uml-element/movable/moving-streamer';
import { ResizingStreamer } from '../uml-element/resizable/resizing-streamer';
import { PatchStreamer } from './patcher-types';


export const streamers: PatchStreamer<UMLModel, Actions>[] = [
  MovingStreamer,
  ResizingStreamer,
];
