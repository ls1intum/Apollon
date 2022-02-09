import { CSSProperties } from 'react';
import { ILayer } from '../services/layouter/layer.js';
import { UMLElement } from '../services/uml-element/uml-element.js';

export type PreviewElement = UMLElement & { styles?: CSSProperties };

export type ComposePreview = (layer: ILayer, translate: (id: string) => string, scale: number) => PreviewElement[];
