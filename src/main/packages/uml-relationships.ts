import { IUMLRelationship, UMLRelationship } from '../services/uml-relationship/uml-relationship';
import { UMLActivityControlFlow } from './uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow';
import { UMLClassAggregation } from './uml-class-diagram/uml-class-aggregation/uml-class-aggregation';
import { UMLClassBidirectional } from './uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { UMLClassComposition } from './uml-class-diagram/uml-class-composition/uml-class-composition';
import { UMLClassDependency } from './uml-class-diagram/uml-class-dependency/uml-class-dependency';
import { UMLClassInheritance } from './uml-class-diagram/uml-class-inheritance/uml-class-inheritance';
import { UMLClassRealization } from './uml-class-diagram/uml-class-realization/uml-class-realization';
import { UMLClassUnidirectional } from './uml-class-diagram/uml-class-unidirectional/uml-class-unidirectional';
import { UMLCommunicationLink } from './uml-communication-diagram/uml-communication-link/uml-communication-link';
import { UMLComponentDependency } from './uml-component-diagram/uml-component-dependency/uml-component-dependency';
import { UMLComponentInterfaceProvided } from './uml-component-diagram/uml-component-interface-provided/uml-component-interface-provided';
import { UMLComponentInterfaceRequired } from './uml-component-diagram/uml-component-interface-required/uml-component-interface-required';
import { UMLDeploymentAssociation } from './uml-deployment-diagram/uml-deployment-association/uml-deployment-association';
import { UMLObjectLink } from './uml-object-diagram/uml-object-link/uml-object-link';
import { UMLRelationshipType } from './uml-relationship-type';
import { UMLUseCaseAssociation } from './uml-use-case-diagram/uml-use-case-association/uml-use-case-association';
import { UMLUseCaseExtend } from './uml-use-case-diagram/uml-use-case-extend/uml-use-case-extend';
import { UMLUseCaseGeneralization } from './uml-use-case-diagram/uml-use-case-generalization/uml-use-case-generalization';
import { UMLUseCaseInclude } from './uml-use-case-diagram/uml-use-case-include/uml-use-case-include';
import { UMLDeploymentInterfaceProvided } from './uml-deployment-diagram/uml-deployment-interface-provided/uml-deployment-interface-provided';
import { UMLDeploymentInterfaceRequired } from './uml-deployment-diagram/uml-deployment-interface-required/uml-deployment-interface-required';
import { UMLDeploymentDependency } from './uml-deployment-diagram/uml-deployment-dependency/uml-deployment-dependency';
import { UMLPetriNetArc } from './uml-petri-net/uml-petri-net-arc/uml-petri-net-arc';
import { UMLReachabilityGraphArc } from './uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc';
import { SyntaxTreeLink } from './syntax-tree/syntax-tree-link/syntax-tree-link';
import { FlowchartFlowline } from './flowchart/flowchart-flowline/flowchart-flowline';
import { BPMNFlow } from './bpmn/bpmn-flow/bpmn-flow';

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
  [UMLRelationshipType.BPMNFlow]: BPMNFlow,
};
