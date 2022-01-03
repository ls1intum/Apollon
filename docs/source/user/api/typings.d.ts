import { DeepPartial } from 'redux';
import { Styles } from './components/theme/styles';
import { UMLDiagramType } from './packages/diagram-type';
import { UMLElementType } from './packages/uml-element-type';
import { UMLRelationshipType } from './packages/uml-relationship-type';
import { ApollonMode, Locale } from './services/editor/editor-types';
import { Direction } from './services/uml-element/uml-element-port';
import { IBoundary } from './utils/geometry/boundary';
import { IPath } from './utils/geometry/path';
export { UMLDiagramType, UMLElementType, UMLRelationshipType, ApollonMode, Locale };
export type { Styles };
export declare type ApollonOptions = {
    type?: UMLDiagramType;
    mode?: ApollonMode;
    readonly?: boolean;
    enablePopups?: boolean;
    model?: UMLModel;
    theme?: DeepPartial<Styles>;
    locale?: Locale;
    copyPasteToClipboard?: boolean;
    colorEnabled?: boolean;
    scale?: number;
};
export declare type Selection = {
    elements: string[];
    relationships: string[];
};
export declare type UMLModel = {
    version: string;
    type: UMLDiagramType;
    size: {
        width: number;
        height: number;
    };
    elements: UMLElement[];
    interactive: Selection;
    relationships: UMLRelationship[];
    assessments: Assessment[];
};
export declare type UMLModelElementType = UMLElementType | UMLRelationshipType | UMLDiagramType;
export declare type UMLModelElement = {
    id: string;
    name: string;
    type: UMLModelElementType;
    owner: string | null;
    bounds: IBoundary;
    highlight?: string;
    fillColor?: string;
    strokeColor?: string;
    textColor?: string;
    assessmentNote?: string;
};
export declare type UMLElement = UMLModelElement & {
    type: UMLElementType;
};
export declare type UMLRelationship = UMLModelElement & {
    type: UMLRelationshipType;
    path: IPath;
    source: {
        element: string;
        direction: Direction;
    };
    target: {
        element: string;
        direction: Direction;
    };
};
export declare type UMLClassifier = UMLElement & {
    attributes: string[];
    methods: string[];
};
export declare type UMLDeploymentNode = UMLElement & {
    stereotype: string;
};
export declare type UMLPetriNetPlace = UMLElement & {
    amountOfTokens: number;
    capacity: number | string;
};
export declare type UMLReachabilityGraphMarking = UMLElement & {
    isInitialMarking: boolean;
};
export declare type UMLAssociation = UMLRelationship & {
    source: UMLRelationship['source'] & {
        multiplicity: string;
        role: string;
    };
    target: UMLRelationship['target'] & {
        multiplicity: string;
        role: string;
    };
};
export declare type UMLCommunicationLink = UMLRelationship & {
    messages: {
        id: string;
        name: string;
        direction: 'source' | 'target';
    }[];
};
export declare type FeedbackCorrectionStatus = {
    description?: string;
    status: 'CORRECT' | 'INCORRECT' | 'NOT_VALIDATED';
};
export declare type Assessment = {
    modelElementId: string;
    elementType: UMLElementType | UMLRelationshipType;
    score: number;
    feedback?: string;
    dropInfo?: any;
    label?: string;
    labelColor?: string;
    correctionStatus?: FeedbackCorrectionStatus;
};
export declare type ExportOptions = {
    margin?: number | {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    keepOriginalSize?: boolean;
    include?: string[];
    exclude?: string[];
    scale?: number;
};
export declare type SVG = {
    svg: string;
    clip: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};
