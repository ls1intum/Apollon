import { ILayer } from '../services/layouter/layer';
import { UMLElement } from '../services/uml-element/uml-element';

export type ComposePreview = (layer: ILayer, translate: (id: string) => string) => UMLElement[];
