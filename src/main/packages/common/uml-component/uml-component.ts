import { IUMLContainer } from '../../../services/uml-container/uml-container';
import { UMLPackage } from '../uml-package/uml-package';

export interface IUMLComponent extends IUMLContainer {
  stereotype: string;
  displayStereotype: boolean;
}

export abstract class UMLComponent extends UMLPackage implements IUMLComponent {
  stereotype = 'component';
  displayStereotype = true;
}
