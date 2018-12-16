import * as React from "react";
import styled from "styled-components";
import EntitySelect from "./EntitySelect";
import RectEdgeSelect from "./RectEdgeSelect";
import BlockInput from "../BlockInput";
import { PopupSectionHeading } from "../PopupSectionHeading";
import { RelationshipEnd } from "./../../../core/domain";
import Element from './../../../domain/Element';
import { DiagramType } from "../../../services/EditorService";
import { RectEdge } from "./../../../core/geometry";
import { UUID } from './../../../domain/utils/uuid';

const Th = styled.th`
    font-weight: normal;
    text-align: left;
    padding: 3px 10px 2px 0;
`;

const Td = styled.td`
    padding: 3px 0;
`;

export default class RelationshipEndDetails extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            multiplicity: props.relationshipEnd.multiplicity || "",
            role: props.relationshipEnd.role || "",
            edgeOffset: props.relationshipEnd.edgeOffset
        };
    }

    updateEntityId = (entityId: UUID) => {
        this.props.updateRelationshipEnd({
            ...this.props.relationshipEnd,
            entityId
        });
    };

    updateMultiplicity = (e: React.FormEvent<HTMLInputElement>) => {
        const multiplicity = e.currentTarget.value.trim() || null;
        if (multiplicity !== this.props.relationshipEnd.multiplicity) {
            this.props.updateRelationshipEnd({
                ...this.props.relationshipEnd,
                multiplicity
            });
        }
    };

    updateRole = (e: React.FormEvent<HTMLInputElement>) => {
        const role = e.currentTarget.value.trim() || null;
        if (role !== this.props.relationshipEnd.role) {
            this.props.updateRelationshipEnd({
                ...this.props.relationshipEnd,
                role
            });
        }
    };

    updateRectEdge = (edge: RectEdge) => {
        this.props.updateRelationshipEnd({
            ...this.props.relationshipEnd,
            edge
        });
    };

    updateRectEdgeOffset = () => {
        this.props.updateRelationshipEnd({
            ...this.props.relationshipEnd,
            edgeOffset: this.state.edgeOffset
        });
    };

    componentWillReceiveProps(nextProps: Props) {
        this.setState({
            multiplicity: nextProps.relationshipEnd.multiplicity || "",
            role: nextProps.relationshipEnd.role || "",
            edgeOffset: nextProps.relationshipEnd.edgeOffset
        });
    }

    render() {
        return (
            <div>
                <PopupSectionHeading>{this.props.heading}</PopupSectionHeading>
                <table>
                    <tbody>
                        <tr>
                            <Th>Entity:</Th>
                            <Td>
                                <EntitySelect
                                    entities={this.props.entities}
                                    selectedEntityId={this.props.relationshipEnd.entityId}
                                    onSelectedEntityIdChange={this.updateEntityId}
                                />
                            </Td>
                        </tr>
                        <tr>
                            <Th>Edge:</Th>
                            <Td>
                                <RectEdgeSelect
                                    edge={this.props.relationshipEnd.edge}
                                    onRectEdgeChange={this.updateRectEdge}
                                />
                            </Td>
                        </tr>
                        {this.props.diagramType === DiagramType.ClassDiagram &&
                            <tr>
                                <Th>Multiplicity:</Th>
                                <Td>
                                    <BlockInput
                                        value={this.state.multiplicity}
                                        onChange={e => {
                                            this.setState({
                                                multiplicity: e.currentTarget.value
                                            });
                                        }}
                                        onKeyUp={e => {
                                            if (e.key === "Enter") {
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        onBlur={this.updateMultiplicity}
                                        placeholder="0..*"
                                    />
                                </Td>
                            </tr>
                        }
                        <tr>
                            <Th>Role:</Th>
                            <Td>
                                <BlockInput
                                    value={this.state.role}
                                    onChange={e => {
                                        this.setState({
                                            role: e.currentTarget.value
                                        });
                                    }}
                                    onKeyUp={e => {
                                        if (e.key === "Enter") {
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    onBlur={this.updateRole}
                                    placeholder="children"
                                />
                            </Td>
                        </tr>
                        {/* <tr>
                            <Th>Offset:</Th>
                            <Td>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={this.state.edgeOffset}
                                    onChange={e => {
                                        this.setState({
                                            edgeOffset: parseFloat(e.currentTarget.value)
                                        });
                                    }}
                                    onKeyUp={this.updateRectEdgeOffset}
                                    onMouseUp={this.updateRectEdgeOffset}
                                />
                            </Td>
                        </tr> */}
                    </tbody>
                </table>
            </div>
        );
    }
}

interface Props {
    diagramType: DiagramType;
    heading: string;
    entity: Element;
    entities: Element[];
    relationshipEnd: RelationshipEnd;
    updateRelationshipEnd: (relationshipEnd: RelationshipEnd) => void;
}

interface State {
    multiplicity: string;
    role: string;
    edgeOffset: number;
}
