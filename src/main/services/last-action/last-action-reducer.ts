import { Reducer } from 'redux';
import { Actions } from '../actions.js';
import { LastActionState } from './last-action-types.js';

export const LastActionReducer: Reducer<LastActionState, Actions> = (state = '', action) => {
  return action.type;
};
