import { UMLElementFeatures } from '../uml-element/uml-element-features.js';

export type UMLRelationshipFeatures = {
  reconnectable: boolean;
  straight: boolean;
  variable: boolean;
} & UMLElementFeatures;
