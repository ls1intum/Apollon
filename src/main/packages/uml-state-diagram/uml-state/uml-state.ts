import { StateElementType } from '..';
import { UMLState } from '../../common/uml-state/uml-state';
import { UMLElementType } from '../../uml-element-type';
import { UMLStateVariable } from '../../common/uml-state/uml-state-variable';
import { UMLStateAction } from '../../common/uml-state/uml-state-action';
import { IUMLElement } from '../../../services/uml-element/uml-element';

export class UMLState_ extends UMLState {
  type: UMLElementType = StateElementType.State_;

  reorderChildren(children: IUMLElement[]): string[] {
    const variables = children.filter((x): x is UMLStateVariable => x.type === StateElementType.StateVariable_);
    const actions = children.filter((x): x is UMLStateAction => x.type === StateElementType.StateAction_);
    return [...variables.map((element) => element.id), ...actions.map((element) => element.id)];
  }
}
