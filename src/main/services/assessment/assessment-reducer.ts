import { Reducer } from 'redux';
import { Actions } from '../actions';
import { AssessmentActionTypes, AssessmentState } from './assessment-types';

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
  }
  return state;
};
