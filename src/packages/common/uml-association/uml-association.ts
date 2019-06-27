import { DeepPartial } from 'redux';
import { ILayer } from 'src/services/layouter/layer';
import { ILayoutable } from 'src/services/layouter/layoutable';
import { Direction, IUMLElementPort } from '../../../services/uml-element/uml-element-port';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { assign } from '../../../utils/fx/assign';

export interface IUMLAssociation extends IUMLRelationship {
  source: IUMLElementPort & {
    multiplicity: string;
    role: string;
  };
  target: IUMLElementPort & {
    multiplicity: string;
    role: string;
  };
}

export abstract class UMLAssociation extends UMLRelationship implements IUMLAssociation {
  source: IUMLAssociation['source'] = {
    direction: Direction.Up,
    element: '',
    multiplicity: '',
    role: '',
  };
  target: IUMLAssociation['target'] = {
    direction: Direction.Up,
    element: '',
    multiplicity: '',
    role: '',
  };

  constructor(values?: DeepPartial<IUMLAssociation>) {
    super();
    assign<IUMLAssociation>(this, values);
  }

  render(canvas: ILayer): ILayoutable[] {
    // TODO
    return [this];
  }
}
