import { ActionTypes, AssessAction } from './types';
import { Assessment } from '../..';

export class repository {
  static assess = (element: string, assessment: Assessment): AssessAction => ({
    type: ActionTypes.ASSESS,
    payload: { element, assessment },
  });
}
