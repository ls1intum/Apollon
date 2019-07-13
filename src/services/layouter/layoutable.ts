import { ILayer } from './layer';

export interface ILayoutable {
  /** Position and sizing of the `UMLElement` */
  bounds: { x: number; y: number; width: number; height: number };

  render(layer: ILayer): ILayoutable[];
}
