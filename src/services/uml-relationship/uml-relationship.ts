import { RelationshipType } from '../../packages/relationship-type';
import { Direction } from '../../typings';
import { Port } from '../uml-element/port';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';

export interface IUMLRelationship extends IUMLElement {
  type: RelationshipType;
  path: Array<{ x: number; y: number }>;
  source: {
    element: string;
    direction: Direction;
  };
  target: {
    element: string;
    direction: Direction;
  };
}

export abstract class UMLRelationship extends UMLElement implements IUMLRelationship {
  static features = { ...UMLElement.features, straight: false };

  abstract readonly type: RelationshipType;

  path = [{ x: 0, y: 0 }, { x: 200, y: 100 }];

  source: Port = {
    element: '',
    direction: Direction.Up,
  };

  target: Port = {
    element: '',
    direction: Direction.Up,
  };

  constructor(values?: IUMLRelationship) {
    super();
    if (values) {
      Object.assign(this, {
        ...values,
        path: [...values.path],
        bounds: { ...values.bounds },
        source: { ...values.source },
        target: { ...values.target },
      });
    }
  }

  // static toUMLRelationship(relationship: UMLRelationship): Other {
  //   return {
  //     id: relationship.id,
  //     name: relationship.name,
  //     highlight: relationship.highlight,
  //     type: relationship.type,
  //     owner: null,
  //     source: relationship.source,
  //     target: relationship.target,
  //     path: relationship.path,
  //     bounds: relationship.bounds,
  //   };
  // }
}
