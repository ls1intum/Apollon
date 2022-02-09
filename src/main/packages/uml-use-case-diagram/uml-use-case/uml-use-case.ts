import { UseCaseElementType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLUseCase extends UMLElement {
  type: UMLElementType = UseCaseElementType.UseCase;

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
