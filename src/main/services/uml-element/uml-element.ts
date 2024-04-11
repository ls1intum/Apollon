import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import * as Apollon from '../../typings';
import { assign } from '../../utils/fx/assign';
import { IBoundary } from '../../utils/geometry/boundary';
import { Point } from '../../utils/geometry/point';
import { uuid } from '../../utils/uuid';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { UMLElementFeatures } from './uml-element-features';
import { Direction } from './uml-element-port';

/** Interface of a `UMLElement` defining the properties persisted in the internal storage */
export interface IUMLElement {
  /** Unique Identifier of the `UMLElement` */
  id: string;
  /** Visual name of the `UMLElement` */
  name: string;
  /** Distinct type to recreate the `UMLElement` */
  type: UMLElementType | UMLRelationshipType | UMLDiagramType;
  /** Optional owner of the `UMLElement` */
  owner: string | null;
  /** Position and sizing of the `UMLElement` */
  bounds: IBoundary;
  /** Highlight the element with a specified color */
  highlight?: string;
  /** Colors of the element */
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
  /** Note to show for element's assessment */
  assessmentNote?: string;
  isManuallyLayouted?: boolean;
}

export const enum ResizeFrom {
  TOPLEFT = 'topLeft',
  TOPRIGHT = 'topRight',
  BOTTOMLEFT = 'bottomLeft',
  BOTTOMRIGHT = 'bottomRight',
}

export const getPortsForElement = (element: IUMLElement): { [key in Direction]: Point } => {
  return {
    [Direction.Up]: new Point(element.bounds.width / 2, 0),
    [Direction.Right]: new Point(element.bounds.width, element.bounds.height / 2),
    [Direction.Down]: new Point(element.bounds.width / 2, element.bounds.height),
    [Direction.Left]: new Point(0, element.bounds.height / 2),
    [Direction.Upright]: new Point(element.bounds.width, element.bounds.height / 4),
    [Direction.Downright]: new Point(element.bounds.width, (3 * element.bounds.height) / 4),
    [Direction.Upleft]: new Point(0, element.bounds.height / 4),
    [Direction.Downleft]: new Point(0, (3 * element.bounds.height) / 4),
    [Direction.Topright]: new Point((3 * element.bounds.width) / 4, 0),
    [Direction.Bottomright]: new Point((3 * element.bounds.width) / 4, element.bounds.height),
    [Direction.Topleft]: new Point(element.bounds.width / 4, 0),
    [Direction.Bottomleft]: new Point(element.bounds.width / 4, element.bounds.height),
  };
};

/** Class implementation of `IUMLElement` to use inheritance at runtime */
export abstract class UMLElement implements IUMLElement, ILayoutable {
  /** `UMLElement` type specific feature flags */
  static features: UMLElementFeatures = {
    connectable: true,
    droppable: false,
    hoverable: true,
    movable: true,
    resizable: true,
    selectable: true,
    updatable: true,
    alternativePortVisualization: false,
  };

  static supportedRelationships: UMLRelationshipType[] = [];

  /** Checks whether an `IUMLElement` is of type `UMLElementType` */
  static isUMLElement = (element: IUMLElement): element is IUMLElement & { type: UMLElementType } =>
    element.type in UMLElementType;

  id = uuid();
  name = '';
  abstract type: UMLElementType | UMLRelationshipType | UMLDiagramType;
  bounds = { x: 0, y: 0, width: 160, height: 100 };
  owner = null as string | null;
  highlight?: string;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
  assessmentNote?: string;
  resizeFrom: ResizeFrom = ResizeFrom.BOTTOMRIGHT;

  constructor(values?: DeepPartial<IUMLElement>) {
    assign<IUMLElement>(this, values);
  }

  /**
   * Clones an instance of `UMLElement`
   *
   * @param override - Override existing properties.
   */
  clone<T extends UMLElement>(override?: DeepPartial<IUMLElement>): T {
    const Constructor = this.constructor as new (values?: DeepPartial<IUMLElement>) => T;
    const values: IUMLElement = { ...this, ...override, id: uuid() };

    return new Constructor(values);
  }

  /** Serializes an `UMLElement` to an `Apollon.UMLElement` */
  serialize(children?: UMLElement[]): Apollon.UMLModelElement {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      owner: this.owner,
      bounds: this.bounds,
      highlight: this.highlight,
      fillColor: this.fillColor,
      strokeColor: this.strokeColor,
      textColor: this.textColor,
      assessmentNote: this.assessmentNote,
    };
  }

  /** Deserializes an `Apollon.UMLElement` to an `UMLElement` */
  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    this.id = values.id;
    this.name = values.name;
    this.type = values.type;
    this.owner = values.owner || null;
    this.bounds = { ...values.bounds };
    this.highlight = values.highlight;
    this.fillColor = values.fillColor;
    this.strokeColor = values.strokeColor;
    this.textColor = values.textColor;
    this.assessmentNote = values.assessmentNote;
  }

  abstract render(canvas: ILayer): ILayoutable[];
}
