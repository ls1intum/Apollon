import { IUMLRelationship, UMLRelationship } from '../services/uml-relationship/uml-relationship';
import { ActivityControlFlow } from './activity-diagram/activity-control-flow/activity-control-flow';
import { ClassAggregation } from './class-diagram/uml-class-aggregation/uml-class-aggregation';
import { ClassBidirectional } from './class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { ClassComposition } from './class-diagram/uml-class-composition/uml-class-composition';
import { ClassDependency } from './class-diagram/uml-class-dependency/uml-class-dependency';
import { ClassInheritance } from './class-diagram/uml-class-inheritance/uml-class-inheritance';
import { ClassRealization } from './class-diagram/uml-class-realization/uml-class-realization';
import { ClassUnidirectional } from './class-diagram/uml-class-unidirectional/uml-class-unidirectional';
import { CommunicationLink } from './communication-diagram/communication-link/communication-link';
import { ComponentDependency } from './component-diagram/component-dependency/component-dependency';
import { ComponentInterfaceProvided } from './component-diagram/component-interface-provided/component-interface-provided';
import { ComponentInterfaceRequired } from './component-diagram/component-interface-required/component-interface-required';
import { DeploymentAssociation } from './deployment-diagram/deployment-association/deployment-association';
import { UMLObjectLink } from './object-diagram/uml-object-link/uml-object-link';
import { UMLRelationshipType } from './uml-relationship-type';
import { UseCaseAssociation } from './use-case-diagram/use-case-association/use-case-association';
import { UseCaseExtend } from './use-case-diagram/use-case-extend/use-case-extend';
import { UseCaseGeneralization } from './use-case-diagram/use-case-generalization/use-case-generalization';
import { UseCaseInclude } from './use-case-diagram/use-case-include/use-case-include';

type UMLRelationships = { [key in UMLRelationshipType]: new (values?: IUMLRelationship) => UMLRelationship };

export const UMLRelationships = {
  [UMLRelationshipType.ClassAggregation]: ClassAggregation,
  [UMLRelationshipType.ClassBidirectional]: ClassBidirectional,
  [UMLRelationshipType.ClassComposition]: ClassComposition,
  [UMLRelationshipType.ClassDependency]: ClassDependency,
  [UMLRelationshipType.ClassInheritance]: ClassInheritance,
  [UMLRelationshipType.ClassRealization]: ClassRealization,
  [UMLRelationshipType.ClassUnidirectional]: ClassUnidirectional,
  [UMLRelationshipType.ObjectLink]: UMLObjectLink,
  [UMLRelationshipType.ActivityControlFlow]: ActivityControlFlow,
  [UMLRelationshipType.UseCaseAssociation]: UseCaseAssociation,
  [UMLRelationshipType.UseCaseExtend]: UseCaseExtend,
  [UMLRelationshipType.UseCaseGeneralization]: UseCaseGeneralization,
  [UMLRelationshipType.UseCaseInclude]: UseCaseInclude,
  [UMLRelationshipType.CommunicationLink]: CommunicationLink,
  [UMLRelationshipType.ComponentDependency]: ComponentDependency,
  [UMLRelationshipType.ComponentInterfaceProvided]: ComponentInterfaceProvided,
  [UMLRelationshipType.ComponentInterfaceRequired]: ComponentInterfaceRequired,
  [UMLRelationshipType.DeploymentAssociation]: DeploymentAssociation,
};
