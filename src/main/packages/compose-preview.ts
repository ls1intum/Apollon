import { ILayer } from '../services/layouter/layer';
import { UMLElement } from '../services/uml-element/uml-element';
import { CSSProperties } from 'react';

export type PreviewElement = UMLElement & { styles?: CSSProperties };

export type ComposePreview = (layer: ILayer, translate: (id: string) => string) => PreviewElement[];
