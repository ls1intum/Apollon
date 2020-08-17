import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { DeploymentRelationshipType } from '../../uml-deployment-diagram';
import { ComponentRelationshipType } from '../../uml-component-diagram';
import { IUMLElement } from '../../../services/uml-element/uml-element';

export abstract class UMLInterfaceRequired extends UMLRelationship {
  static features = { ...UMLRelationship.features, variable: false };

  static isUMLInterfaceRequired = (element: IUMLElement): element is IUMLRelationship => {
    return (
      UMLInterfaceRequired.isUMLRelationship(element) &&
      (element.type === DeploymentRelationshipType.DeploymentInterfaceRequired ||
        element.type === ComponentRelationshipType.ComponentInterfaceRequired)
    );
  };
}
