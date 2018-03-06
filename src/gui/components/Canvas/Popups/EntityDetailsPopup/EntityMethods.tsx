import * as React from "react";
import EntityMemberList from "./EntityMemberList";
import EntityMembersHeading from "./EntityMembersHeading";
import { Entity, EntityMember, EntityRenderMode } from "../../../../../uml";
import { UUID } from "../../../../../uuid";

export default class EntityMethods extends React.Component<Props> {
    handleShowMethodsChange = (showMethods: boolean) => {
        this.props.updateEntityRenderMode({
            ...this.props.entity.renderMode,
            showMethods
        });
    };

    render() {
        const { entity } = this.props;

        return (
            <div>
                <EntityMembersHeading
                    heading="Methods"
                    renderMembers={entity.renderMode.showMethods}
                    onShowMembersChange={this.handleShowMethodsChange}
                />

                {entity.renderMode.showMethods && (
                    <EntityMemberList
                        entityMembers={entity.methods}
                        addNewMemberPlaceholder="New method"
                        deleteEntityMemberButtonTitle="Delete method"
                        createEntityMember={this.props.createEntityMethod}
                        updateEntityMember={this.props.updateEntityMethod}
                        deleteEntityMember={this.props.deleteEntityMethod}
                    />
                )}
            </div>
        );
    }
}

interface Props {
    entity: Entity;
    updateEntityRenderMode: (renderMode: EntityRenderMode) => void;
    createEntityMethod: (method: EntityMember) => void;
    updateEntityMethod: (method: EntityMember) => void;
    deleteEntityMethod: (memberId: UUID) => void;
}
