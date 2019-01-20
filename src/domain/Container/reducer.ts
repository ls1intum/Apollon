import { Reducer, AnyAction } from 'redux';
import { ActionTypes } from './types';
import { Actions } from './repository';
import { ElementState } from './../Element';

const initialState: ElementState = {};

const ContainerReducer: Reducer<ElementState, AnyAction> = (
  state: ElementState = initialState,
  action: AnyAction
): ElementState => {
  switch (action.type) {
    case ActionTypes.ADD_ELEMENT:
      console.log('ADD ELEMENT', state);
  }
  return state;
};

export default ContainerReducer;
