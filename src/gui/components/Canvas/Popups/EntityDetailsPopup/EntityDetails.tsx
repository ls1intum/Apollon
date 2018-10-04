import * as React from "react";
import EntityAttributes from "./EntityAttributes";
import EntityKindSelect from "./EntityKindSelect";
import EntityMethods from "./EntityMethods";
import EntityNameInput from "./EntityNameInput";
import { PopupSection } from "../PopupSection";
import { Entity, EntityKind, EntityMember, EntityRenderMode } from "../../../../../core/domain";
import { UUID } from "../../../../../core/utils";

export default class EntityDetails extends React.Component<Props> {
    render() {
        if (this.props.entity.kind === EntityKind.ActivityActionNode
            || this.props.entity.kind === EntityKind.ActivityObject
            || this.props.entity.kind === EntityKind.ActivityMergeNode) {
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
                    <EntityKindSelect
                        entityKind={this.props.entity.kind}
                        updateEntityKind={this.props.updateEntityKind}
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
    entity: Entity;
    updateEntityKind: (kind: EntityKind) => void;
    updateEntityName: (name: string) => void;
    updateEntityRenderMode: (renderMode: EntityRenderMode) => void;
    createEntityAttribute: (attribute: EntityMember) => void;
    createEntityMethod: (method: EntityMember) => void;
    updateEntityMember: (member: EntityMember) => void;
    deleteEntityMember: (memberId: UUID) => void;
}
