import { StateElementType } from '..';
import { UMLStateVariable } from '../../common/uml-state/uml-state-variable';
import { UMLElementType } from '../../uml-element-type';

export class UMLStateVariable_ extends UMLStateVariable {
  type: UMLElementType = StateElementType.StateVariable_;
}
