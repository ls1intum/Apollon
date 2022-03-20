import { Reducer } from 'redux';
import { IBoundary } from '../../../utils/geometry/boundary';
import { Actions } from '../../actions';
import { ResizeFrom } from '../uml-element';
import { ResizingActionTypes, ResizingState } from './resizing-types';

export const ResizingReducer: Reducer<ResizingState, Actions> = (state = {}, action) => {
  const obj = { x: 0, y: 0 };

  const getUpdatedPosition = (elem: IBoundary, payload: any, resizeFrom: ResizeFrom) => {
    switch (resizeFrom) {
      case ResizeFrom.TOPLEFT:
        obj.x = Math.min(elem.x - payload.delta.width, elem.x + elem.width);
        obj.y = Math.min(elem.y - payload.delta.height, elem.y + elem.height);
        break;
      case ResizeFrom.TOPRIGHT:
        obj.x = elem.x;
        obj.y = Math.min(elem.y - payload.delta.height, elem.y + elem.height);
        break;
      case ResizeFrom.BOTTOMLEFT:
        obj.x = Math.min(elem.x - payload.delta.width, elem.x + elem.width);
        obj.y = elem.y;
        break;
      case ResizeFrom.BOTTOMRIGHT:
        obj.x = elem.x;
        obj.y = elem.y;
        break;
      default:
        obj.x = elem.x;
        obj.y = elem.y;
        break;
    }
    return obj;
  };

  switch (action.type) {
    case ResizingActionTypes.RESIZE: {
      const { payload } = action;

      return payload.ids.reduce<ResizingState>(
        (elements, id) => ({
          ...elements,
          ...(id in elements && {
            [id]: {
              ...elements[id],
              bounds: {
                ...elements[id].bounds,
                x: getUpdatedPosition(elements[id].bounds, payload, payload.resizeFrom).x,
                y: getUpdatedPosition(elements[id].bounds, payload, payload.resizeFrom).y,
                width: Math.max(elements[id].bounds.width + payload.delta.width, 0),
                height: Math.max(elements[id].bounds.height + payload.delta.height, 0),
              },
              resizeFrom: payload.resizeFrom,
            },
          }),
        }),
        state,
      );
    }
  }

  return state;
};
