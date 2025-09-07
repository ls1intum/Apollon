import { DeepPartial } from 'redux';
import { UseCaseElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { assign } from '../../../utils/fx/assign';
import { UMLElementType } from '../../uml-element-type';

export class UMLUseCaseActor extends UMLElement {
  type: UMLElementType = UseCaseElementType.UseCaseActor;

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    assign<IUMLElement>(this, values);
    this.bounds = { ...this.bounds, width: values?.bounds?.width ?? 90, height: values?.bounds?.height ?? 140 };
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
