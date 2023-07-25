import { UMLModel } from '../../../typings';
import { Actions } from '../../actions';
import { PatchStreamer } from '../../patcher/patcher-types';
import { MovingActionTypes } from './moving-types';


/**
 * 
 * A streamer that produces patches for moving elements. This allows
 * smooth update of the position of elements on remote clients.
 * 
 */
export const MovingStreamer: PatchStreamer<UMLModel, Actions> = (model, action, stream) => {
  if (action.type === MovingActionTypes.MOVE) {
    const { payload } = action;
    return payload.ids.map((id) => {
      //
      // in the transformed model, the elements are stored in an array (unfortunately),
      // so we should map the id to the index of the element in the array
      //
      const index = model.elements.findIndex((e) => e.id === id);

      if (index !== -1) {
        //
        // if there is a change in the x coordinates,
        // produce a patch for the x coordinate
        //
        if (payload.delta.x !== 0) {
          stream({
            op: 'replace',
            path: `/elements/${index}/bounds/x`,
            value: model.elements[index].bounds.x + payload.delta.x,
          });
        }

        //
        // if there is a change in the y coordinates,
        // produce a patch for the y coordinate
        //
        if (payload.delta.y !== 0) {
          stream({
            op: 'replace',
            path: `/elements/${index}/bounds/y`,
            value: model.elements[index].bounds.y + payload.delta.y,
          });
        }
      }
    });
  }
};
