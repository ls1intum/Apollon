import { IRelationship, Relationship } from '../services/relationship/relationship';
import { UMLRelationship } from '../typings';
import { ActivityControlFlow } from './activity-diagram/activity-control-flow/activity-control-flow';
import { ClassAggregation } from './class-diagram/class-association/class-aggregation/class-aggregation';
import { ClassBidirectional } from './class-diagram/class-association/class-bidirectional/class-bidirectional';
import { ClassComposition } from './class-diagram/class-association/class-composition/class-composition';
import { ClassDependency } from './class-diagram/class-association/class-dependency/class-dependency';
import { ClassInheritance } from './class-diagram/class-association/class-inheritance/class-inheritance';
import { ClassRealization } from './class-diagram/class-association/class-realization/class-realization';
import { ClassUnidirectional } from './class-diagram/class-association/class-unidirectional/class-unidirectional';
import { CommunicationLink } from './communication-diagram/communication-link/communication-link';
import { ComponentDependency } from './component-diagram/component-dependency/component-dependency';
import { ComponentInterfaceProvided } from './component-diagram/component-interface-provided/component-interface-provided';
import { ComponentInterfaceRequired } from './component-diagram/component-interface-required/component-interface-required';
import { DeploymentAssociation } from './deployment-diagram/deployment-association/deployment-association';
import { ObjectLink } from './object-diagram/object-link/object-link';
import { RelationshipType } from './relationship-type';
import { UseCaseAssociation } from './use-case-diagram/use-case-association/use-case-association';
import { UseCaseExtend } from './use-case-diagram/use-case-extend/use-case-extend';
import { UseCaseGeneralization } from './use-case-diagram/use-case-generalization/use-case-generalization';
import { UseCaseInclude } from './use-case-diagram/use-case-include/use-case-include';

type Relationships = { [key in RelationshipType]: new (values?: IRelationship | UMLRelationship) => Relationship };

export const Relationships = {
  [RelationshipType.ClassAggregation]: ClassAggregation,
  [RelationshipType.ClassBidirectional]: ClassBidirectional,
  [RelationshipType.ClassComposition]: ClassComposition,
  [RelationshipType.ClassDependency]: ClassDependency,
  [RelationshipType.ClassInheritance]: ClassInheritance,
  [RelationshipType.ClassRealization]: ClassRealization,
  [RelationshipType.ClassUnidirectional]: ClassUnidirectional,
  [RelationshipType.ObjectLink]: ObjectLink,
  [RelationshipType.ActivityControlFlow]: ActivityControlFlow,
  [RelationshipType.UseCaseAssociation]: UseCaseAssociation,
  [RelationshipType.UseCaseExtend]: UseCaseExtend,
  [RelationshipType.UseCaseGeneralization]: UseCaseGeneralization,
  [RelationshipType.UseCaseInclude]: UseCaseInclude,
  [RelationshipType.CommunicationLink]: CommunicationLink,
  [RelationshipType.ComponentDependency]: ComponentDependency,
  [RelationshipType.ComponentInterfaceProvided]: ComponentInterfaceProvided,
  [RelationshipType.ComponentInterfaceRequired]: ComponentInterfaceRequired,
  [RelationshipType.DeploymentAssociation]: DeploymentAssociation,
};
