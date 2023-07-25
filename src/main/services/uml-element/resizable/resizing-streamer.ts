import { UMLModel } from '../../../typings';
import { IBoundary } from '../../../utils/geometry/boundary';
import { Actions } from '../../actions';
import { PatchStreamer } from '../../patcher/patcher-types';
import { ResizeFrom } from '../uml-element';
import { ResizingActionTypes } from './resizing-types';

//
// resizing an element from top-left or bottom-left
// corners also affects the position of the element,
// so we need to update the position as well
//
const getUpdatedPosition = (elem: IBoundary, payload: any, resizeFrom: ResizeFrom) => {
  switch (resizeFrom) {
    case ResizeFrom.TOPLEFT:
      return {
        x: Math.min(elem.x - payload.delta.width, elem.x + elem.width),
        y: Math.min(elem.y - payload.delta.height, elem.y + elem.height)
      };
    case ResizeFrom.TOPRIGHT:
      return {
        x: elem.x,
        y: Math.min(elem.y - payload.delta.height, elem.y + elem.height)
      };
    case ResizeFrom.BOTTOMLEFT:
      return { 
        x: Math.min(elem.x - payload.delta.width, elem.x + elem.width),
        y: elem.y
      };
    case ResizeFrom.BOTTOMRIGHT:
      return { x: elem.x, y: elem.y };
    default:
      return { x: elem.x, y: elem.y };
  }
};


/**
 * 
 * A streamer that produces patches for resizing elements. This allows
 * smooth update of the size of elements on remote clients.
 * 
 */
export const ResizingStreamer: PatchStreamer<UMLModel, Actions> = (model, action, stream) => {
  if (action.type === ResizingActionTypes.RESIZE) {
    const { payload } = action;
    return payload.ids.map((id) => {
      //
      // in the transformed model, the elements are stored in an array (unfortunately),
      // so we should map the id to the index of the element in the array
      //
      const index = model.elements.findIndex((e) => e.id === id);

      if (index !== -1) {
        const elem = model.elements[index];

        //
        // lets calculate the new bounds of the resized element.
        //
        const bounds = {
          x: getUpdatedPosition(model.elements[index].bounds, payload, payload.resizeFrom).x,
          y: getUpdatedPosition(model.elements[index].bounds, payload, payload.resizeFrom).y,
          width: Math.max(model.elements[index].bounds.width + payload.delta.width, 0),
          height: Math.max(model.elements[index].bounds.height + payload.delta.height, 0),
        };

        //
        // and produce patches for any of its dimnesions that has changed.
        //

        if (bounds.x !== elem.bounds.x) {
          stream({
            op: 'replace',
            path: `/elements/${index}/bounds/x`,
            value: bounds.x
          });
        }

        if (bounds.y !== elem.bounds.y) {
          stream({
            op: 'replace',
            path: `/elements/${index}/bounds/y`,
            value: bounds.y
          });
        }

        if (bounds.width !== elem.bounds.width) {
          stream({
            op: 'replace',
            path: `/elements/${index}/bounds/width`,
            value: bounds.width
          });
        }

        if (bounds.height !== elem.bounds.height) {
          stream({
            op: 'replace',
            path: `/elements/${index}/bounds/height`,
            value: bounds.height
          });
        }
      }
    });
  }
};