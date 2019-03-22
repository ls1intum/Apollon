import { ApollonView, ChangeViewAction, ActionTypes } from './types';

export class repository {
  static changeView = (view: ApollonView): ChangeViewAction => ({
    type: ActionTypes.CHANGE_VIEW,
    payload: { view },
  });
}
