import { Reducer } from 'redux';
import { Actions } from '../actions';
import { LastActionState } from './last-action-types';

export const LastActionReducer: Reducer<LastActionState, Actions> = (state = '', action) => {
  return action.type;
};
