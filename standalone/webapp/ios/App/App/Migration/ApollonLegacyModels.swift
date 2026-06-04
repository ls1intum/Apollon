// Frozen snapshot of the legacy native-iOS data models (apollon-ios-module
// ApollonShared), reduced to the Codable/stored shape only. See README.md.
//
// WARNING: do NOT change these types. Their Codable shape must stay byte-equal
// to what the legacy app persisted, or its SwiftData store fails to open/decode.

import Foundation
import CoreGraphics
import SwiftData

// Identifiers and raw values mirror the legacy on-disk schema exactly (e.g. the
// `x`/`y` keys, the `Class` case, `Up` direction). They cannot be renamed
// without breaking Codable decoding, so the relevant style rules are disabled —
// the legacy source did the same.
// swiftlint:disable identifier_name redundant_string_enum_value

// MARK: - Enums

enum UMLDiagramType: String, Codable {
    case classDiagram = "ClassDiagram"
    case objectDiagram = "ObjectDiagram"
    case activityDiagram = "ActivityDiagram"
    case useCaseDiagram = "UseCaseDiagram"
    case communicationDiagram = "CommunicationDiagram"
    case componentDiagram = "ComponentDiagram"
    case deploymentDiagram = "DeploymentDiagram"
    case petriNet = "PetriNet"
    case reachabilityGraph = "ReachabilityGraph"
    case syntaxTree = "SyntaxTree"
    case flowchart = "Flowchart"
    case BPMN = "BPMN"
}

enum UMLElementType: String, Codable {
    case colorLegend = "ColorLegend"
    case flowchartTerminal = "FlowchartTerminal"
    case flowchartProcess = "FlowchartProcess"
    case flowchartDecision = "FlowchartDecision"
    case flowchartInputOutput = "FlowchartInputOutput"
    case flowchartFunctionCall = "FlowchartFunctionCall"
    case syntaxTreeTerminal = "SyntaxTreeTerminal"
    case syntaxTreeNonterminal = "SyntaxTreeNonterminal"
    case reachabilityGraphMarking = "ReachabilityGraphMarking"
    case petriNetPlace = "PetriNetPlace"
    case petriNetTransition = "PetriNetTransition"
    case deploymentNode = "DeploymentNode"
    case deploymentComponent = "DeploymentComponent"
    case deploymentArtifact = "DeploymentArtifact"
    case deploymentInterface = "DeploymentInterface"
    case component = "Component"
    case componentSubsystem = "Subsystem"
    case componentInterface = "ComponentInterface"
    case communicationLinkMessage = "CommunicationLinkMessage"
    case useCase = "UseCase"
    case useCaseActor = "UseCaseActor"
    case useCaseSystem = "UseCaseSystem"
    case activity = "Activity"
    case activityActionNode = "ActivityActionNode"
    case activityFinalNode = "ActivityFinalNode"
    case activityForkNode = "ActivityForkNode"
    case activityForkNodeHorizontal = "ActivityForkNodeHorizontal"
    case activityInitialNode = "ActivityInitialNode"
    case activityMergeNode = "ActivityMergeNode"
    case activityObjectNode = "ActivityObjectNode"
    case objectName = "ObjectName"
    case objectAttribute = "ObjectAttribute"
    case objectMethod = "ObjectMethod"
    case package = "Package"
    case Class = "Class"
    case abstractClass = "AbstractClass"
    case interface = "Interface"
    case enumeration = "Enumeration"
    case classAttribute = "ClassAttribute"
    case classMethod = "ClassMethod"
}

enum UMLRelationshipType: String, Codable {
    case flowchartFlowline = "FlowchartFlowline"
    case syntaxTreeLink = "SyntaxTreeLink"
    case reachabilityGraphArc = "ReachabilityGraphArc"
    case petriNetArc = "PetriNetArc"
    case deploymentAssociation = "DeploymentAssociation"
    case deploymentInterfaceProvided = "DeploymentInterfaceProvided"
    case deploymentInterfaceRequired = "DeploymentInterfaceRequired"
    case deploymentDependency = "DeploymentDependency"
    case componentInterfaceProvided = "ComponentInterfaceProvided"
    case componentInterfaceRequired = "ComponentInterfaceRequired"
    case componentDependency = "ComponentDependency"
    case communicationLink = "CommunicationLink"
    case useCaseAssociation = "UseCaseAssociation"
    case useCaseGeneralization = "UseCaseGeneralization"
    case useCaseInclude = "UseCaseInclude"
    case useCaseExtend = "UseCaseExtend"
    case activityControlFlow = "ActivityControlFlow"
    case objectLink = "ObjectLink"
    case classBidirectional = "ClassBidirectional"
    case classUnidirectional = "ClassUnidirectional"
    case classInheritance = "ClassInheritance"
    case classRealization = "ClassRealization"
    case classDependency = "ClassDependency"
    case classAggregation = "ClassAggregation"
    case classComposition = "ClassComposition"
}

enum Direction: String, Codable {
    case left = "Left"
    case right = "Right"
    case up = "Up"
    case down = "Down"
    case upRight = "Upright"
    case upLeft = "Upleft"
    case downRight = "Downright"
    case downLeft = "Downleft"
    case topRight = "Topright"
    case topLeft = "Topleft"
    case bottomRight = "Bottomright"
    case bottomLeft = "Bottomleft"
}

enum ElementDirection: String, Codable {
    case source = "source"
    case target = "target"
}

// MARK: - Geometry

struct Boundary: Codable {
    var x: Double
    var y: Double
    var width: Double
    var height: Double
}

struct Size: Codable {
    var width: CGFloat
    var height: CGFloat
}

struct PathPoint: Codable {
    var x: Double
    var y: Double
}

// MARK: - Elements & relationships

/// Mirrors the legacy `UMLElement` (a class, because the original used
/// references for parent/child handling). `children` is never persisted — the
/// legacy `encode(to:)` flattens children into the `attributes`/`methods` id
/// arrays — so it decodes to nil from the store, which is exactly what we want.
final class UMLElement: Codable {
    let id: String?
    var name: String?
    var type: UMLElementType?
    var owner: String?
    var bounds: Boundary?
    var direction: ElementDirection?
    var assessmentNote: String?
    var attributes: [String]?
    var methods: [String]?
    var children: [UMLElement]? = []

    enum UMLElementCodingKeys: String, CodingKey {
        case id
        case name
        case type
        case owner
        case bounds
        case direction
        case assessmentNote
        case attributes
        case methods
    }

    // Re-encode without `children`, matching the legacy app's export exactly so
    // importDiagram() receives the canonical v3 element shape.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: UMLElementCodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(type, forKey: .type)
        try container.encode(owner, forKey: .owner)
        try container.encode(bounds, forKey: .bounds)
        try container.encode(direction, forKey: .direction)
        try container.encode(assessmentNote, forKey: .assessmentNote)
        try container.encode(attributes, forKey: .attributes)
        try container.encode(methods, forKey: .methods)
    }
    // init(from:) is synthesized: `children` is optional and absent from the
    // stored bytes, so it decodes to nil.
}

final class UMLRelationship: Codable {
    let id: String?
    var name: String?
    var type: UMLRelationshipType?
    var owner: String?
    var bounds: Boundary?
    var assessmentNote: String?
    var path: [PathPoint]?
    var source: UMLRelationshipEndPoint?
    var target: UMLRelationshipEndPoint?
    var isManuallyLayouted: Bool?
    var messages: [String: UMLElement]?
}

struct UMLRelationshipEndPoint: Codable {
    var direction: Direction?
    var element: String?
    var multiplicity: String?
    var role: String?
}

// MARK: - Model & diagram

struct Interactive: Codable {
    var elements: [String: UMLElement]?
    var relationships: [String: UMLRelationship]?
}

struct UMLModel: Codable {
    var version: String?
    var type: UMLDiagramType?
    var size: Size?
    var interactive: Interactive?
    var elements: [String: UMLElement]?
    var relationships: [String: UMLRelationship]?
    var assessments: [String: String]?
}

/// Codable transport struct (the legacy app's export/import format) used to
/// re-encode each migrated diagram to v3 JSON.
struct Diagram: Codable {
    var id: String?
    var title: String?
    var lastUpdate: String?
    var diagramType: UMLDiagramType?
    var model: UMLModel?
}

// MARK: - Persisted SwiftData model

/// Mirrors the legacy `@Model ApollonDiagram`. The class name and stored
/// property names/types must match the on-disk SwiftData schema exactly, or the
/// store will not open without a migration plan. SwiftData (iOS 17+) only.
@available(iOS 17, *)
@Model
final class ApollonDiagram {
    @Attribute(.unique) var id: String
    @Attribute var title: String
    @Attribute var lastUpdate: String
    @Attribute var diagramType: UMLDiagramType
    @Attribute var model: UMLModel

    init(
        id: String,
        title: String,
        lastUpdate: String,
        diagramType: UMLDiagramType,
        model: UMLModel
    ) {
        self.id = id
        self.title = title
        self.lastUpdate = lastUpdate
        self.diagramType = diagramType
        self.model = model
    }
}

// swiftlint:enable identifier_name redundant_string_enum_value
