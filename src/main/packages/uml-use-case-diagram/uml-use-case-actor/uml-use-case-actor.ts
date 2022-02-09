import { DeepPartial } from 'redux';
import { UseCaseElementType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element.js';
import { assign } from '../../../utils/fx/assign.js';
import { IBoundary } from '../../../utils/geometry/boundary.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLUseCaseActor extends UMLElement {
  type: UMLElementType = UseCaseElementType.UseCaseActor;
  bounds: IBoundary = { ...this.bounds, width: 90, height: 140 };

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    assign<IUMLElement>(this, values);
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
