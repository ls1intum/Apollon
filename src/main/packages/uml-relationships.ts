import { IUMLRelationship, UMLRelationship } from '../services/uml-relationship/uml-relationship.js';
import { UMLActivityControlFlow } from './uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow.js';
import { UMLClassAggregation } from './uml-class-diagram/uml-class-aggregation/uml-class-aggregation.js';
import { UMLClassBidirectional } from './uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional.js';
import { UMLClassComposition } from './uml-class-diagram/uml-class-composition/uml-class-composition.js';
import { UMLClassDependency } from './uml-class-diagram/uml-class-dependency/uml-class-dependency.js';
import { UMLClassInheritance } from './uml-class-diagram/uml-class-inheritance/uml-class-inheritance.js';
import { UMLClassRealization } from './uml-class-diagram/uml-class-realization/uml-class-realization.js';
import { UMLClassUnidirectional } from './uml-class-diagram/uml-class-unidirectional/uml-class-unidirectional.js';
import { UMLCommunicationLink } from './uml-communication-diagram/uml-communication-link/uml-communication-link.js';
import { UMLComponentDependency } from './uml-component-diagram/uml-component-dependency/uml-component-dependency.js';
import { UMLComponentInterfaceProvided } from './uml-component-diagram/uml-component-interface-provided/uml-component-interface-provided.js';
import { UMLComponentInterfaceRequired } from './uml-component-diagram/uml-component-interface-required/uml-component-interface-required.js';
import { UMLDeploymentAssociation } from './uml-deployment-diagram/uml-deployment-association/uml-deployment-association.js';
import { UMLObjectLink } from './uml-object-diagram/uml-object-link/uml-object-link.js';
import { UMLRelationshipType } from './uml-relationship-type.js';
import { UMLUseCaseAssociation } from './uml-use-case-diagram/uml-use-case-association/uml-use-case-association.js';
import { UMLUseCaseExtend } from './uml-use-case-diagram/uml-use-case-extend/uml-use-case-extend.js';
import { UMLUseCaseGeneralization } from './uml-use-case-diagram/uml-use-case-generalization/uml-use-case-generalization.js';
import { UMLUseCaseInclude } from './uml-use-case-diagram/uml-use-case-include/uml-use-case-include.js';
import { UMLDeploymentInterfaceProvided } from './uml-deployment-diagram/uml-deployment-interface-provided/uml-deployment-interface-provided.js';
import { UMLDeploymentInterfaceRequired } from './uml-deployment-diagram/uml-deployment-interface-required/uml-deployment-interface-required.js';
import { UMLDeploymentDependency } from './uml-deployment-diagram/uml-deployment-dependency/uml-deployment-dependency.js';
import { UMLPetriNetArc } from './uml-petri-net/uml-petri-net-arc/uml-petri-net-arc.js';
import { UMLReachabilityGraphArc } from './uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc.js';
import { SyntaxTreeLink } from './syntax-tree/syntax-tree-link/syntax-tree-link.js';
import { FlowchartFlowline } from './flowchart/flowchart-flowline/flowchart-flowline.js';

type UMLRelationships = { [key in UMLRelationshipType]: new (values?: IUMLRelationship) => UMLRelationship };

export const UMLRelationships = {
  [UMLRelationshipType.ClassAggregation]: UMLClassAggregation,
  [UMLRelationshipType.ClassBidirectional]: UMLClassBidirectional,
  [UMLRelationshipType.ClassComposition]: UMLClassComposition,
  [UMLRelationshipType.ClassDependency]: UMLClassDependency,
  [UMLRelationshipType.ClassInheritance]: UMLClassInheritance,
  [UMLRelationshipType.ClassRealization]: UMLClassRealization,
  [UMLRelationshipType.ClassUnidirectional]: UMLClassUnidirectional,
  [UMLRelationshipType.ObjectLink]: UMLObjectLink,
  [UMLRelationshipType.ActivityControlFlow]: UMLActivityControlFlow,
  [UMLRelationshipType.UseCaseAssociation]: UMLUseCaseAssociation,
  [UMLRelationshipType.UseCaseExtend]: UMLUseCaseExtend,
  [UMLRelationshipType.UseCaseGeneralization]: UMLUseCaseGeneralization,
  [UMLRelationshipType.UseCaseInclude]: UMLUseCaseInclude,
  [UMLRelationshipType.CommunicationLink]: UMLCommunicationLink,
  [UMLRelationshipType.ComponentDependency]: UMLComponentDependency,
  [UMLRelationshipType.ComponentInterfaceProvided]: UMLComponentInterfaceProvided,
  [UMLRelationshipType.ComponentInterfaceRequired]: UMLComponentInterfaceRequired,
  [UMLRelationshipType.DeploymentAssociation]: UMLDeploymentAssociation,
  [UMLRelationshipType.DeploymentDependency]: UMLDeploymentDependency,
  [UMLRelationshipType.DeploymentInterfaceProvided]: UMLDeploymentInterfaceProvided,
  [UMLRelationshipType.DeploymentInterfaceRequired]: UMLDeploymentInterfaceRequired,
  [UMLRelationshipType.PetriNetArc]: UMLPetriNetArc,
  [UMLRelationshipType.ReachabilityGraphArc]: UMLReachabilityGraphArc,
  [UMLRelationshipType.SyntaxTreeLink]: SyntaxTreeLink,
  [UMLRelationshipType.FlowchartFlowline]: FlowchartFlowline,
};
