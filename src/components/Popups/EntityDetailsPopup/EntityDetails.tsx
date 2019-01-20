import * as React from "react";
import EntityAttributes from "./EntityAttributes";
import EntityMethods from "./EntityMethods";
import EntityNameInput from "./EntityNameInput";
import { PopupSection } from "../PopupSection";
import { EntityKind } from "./../../../domain/Element";
import Element from './../../../domain/Element';
import { UUID } from './../../../domain/utils/uuid';

interface EntityMember {
    id: string;
    name: string;
}

export default class EntityDetails extends React.Component<Props> {
    render() {
        if (this.props.entity.kind === EntityKind.ActionNode
            || this.props.entity.kind === EntityKind.ObjectNode
            || this.props.entity.kind === EntityKind.MergeNode) {
            return (
                <PopupSection>
                    <EntityNameInput
                        entity={this.props.entity}
                        updateEntityName={this.props.updateEntityName}
                    />
                </PopupSection>
            );
        }

        return (
            <>
                <PopupSection>
                    <EntityNameInput
                        entity={this.props.entity}
                        updateEntityName={this.props.updateEntityName}
                    />
                </PopupSection>

                <PopupSection>
                    <EntityAttributes
                        entity={this.props.entity}
                        updateEntityRenderMode={this.props.updateEntityRenderMode}
                        createEntityAttribute={this.props.createEntityAttribute}
                        updateEntityAttribute={this.props.updateEntityMember}
                        deleteEntityAttribute={this.props.deleteEntityMember}
                    />
                </PopupSection>

                <PopupSection>
                    <EntityMethods
                        entity={this.props.entity}
                        updateEntityRenderMode={this.props.updateEntityRenderMode}
                        createEntityMethod={this.props.createEntityMethod}
                        updateEntityMethod={this.props.updateEntityMember}
                        deleteEntityMethod={this.props.deleteEntityMember}
                    />
                </PopupSection>
            </>
        );
    }
}

interface Props {
    entity: Element;
    updateEntityName: (name: string) => void;
    updateEntityRenderMode: (renderMode: any) => void;
    createEntityAttribute: (attribute: EntityMember) => void;
    createEntityMethod: (method: EntityMember) => void;
    updateEntityMember: (member: EntityMember) => void;
    deleteEntityMember: (memberId: UUID) => void;
}
