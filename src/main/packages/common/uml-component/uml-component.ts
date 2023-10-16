import { UMLPackage } from '../uml-package/uml-package';

export interface IUMLComponent {
  stereotype: string;
}

export abstract class UMLComponent extends UMLPackage implements IUMLComponent {
  stereotype = 'component';
}
