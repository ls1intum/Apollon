import { Reducer } from 'redux';
import { Actions } from '../actions.js';
import { AssessmentActionTypes, AssessmentState } from './assessment-types.js';
import { UMLElementActionTypes } from '../uml-element/uml-element-types.js';

const initialState: AssessmentState = {};

export const AssessmentReducer: Reducer<AssessmentState, Actions> = (state = initialState, action) => {
  switch (action.type) {
    case AssessmentActionTypes.ASSESS: {
      const { payload } = action;
      return {
        ...state,
        [payload.element]: payload.assessment,
      };
    }
    case AssessmentActionTypes.DELETE: {
      const { payload } = action;
      const newState = { ...state };
      delete newState[payload.element];
      return newState;
    }
    case UMLElementActionTypes.DELETE: {
      const { payload } = action;
      return Object.keys(state).reduce<AssessmentState>(
        (assessments, id) => ({
          ...assessments,
          ...(!payload.ids.includes(id) && { [id]: state[id] }),
        }),
        {},
      );
    }
  }
  return state;
};
