import * as React from "react";
import EntityMemberList from "./EntityMemberList";
import EntityMembersHeading from "./EntityMembersHeading";
import { EntityRenderMode } from "./../../../core/domain";
import Element from './../../../domain/Element';
import { UUID } from './../../../domain/utils/uuid';
import { EntityMember } from '../../../domain/plugins/class/Member';
import * as Plugins from './../../../domain/plugins';
import { EntityKind } from './../../../core/domain';

export default class EntityAttributes extends React.Component<Props> {
    handleShowAttributesChange = (showAttributes: boolean) => {
        let element: any = {};
        switch (this.props.entity.kind) {
            case EntityKind.Class:
                element = this.props.entity as Plugins.Class;
                element.renderMode.showAttributes = showAttributes;
                break;
            case EntityKind.AbstractClass:
                element = this.props.entity as Plugins.AbstractClass;
                element.renderMode.showAttributes = showAttributes;
                break;
            case EntityKind.Interface:
                element = this.props.entity as Plugins.Interface;
                element.renderMode.showAttributes = showAttributes;
                break;
            case EntityKind.Enumeration:
                element = this.props.entity as Plugins.Enumeration;
                element.renderMode.showAttributes = showAttributes;
                break;
        }
        this.props.updateEntityRenderMode({
            ...element.renderMode,
            showAttributes
        });
    };

    render() {
        const { entity } = this.props;
        let renderMode = { showAttributes: false, showMethods: false };
        let attributes: EntityMember[] = [];
        let element;
        switch (entity.kind) {
            case EntityKind.Class:
                element = entity as Plugins.Class;
                renderMode = element.renderMode;
                attributes = element.attributes;
                break;
            case EntityKind.AbstractClass:
                element = entity as Plugins.AbstractClass;
                renderMode = element.renderMode;
                attributes = element.attributes;
                break;
            case EntityKind.Interface:
                element = entity as Plugins.Interface;
                renderMode = element.renderMode;
                attributes = element.attributes;
                break
            case EntityKind.Enumeration:
                element = entity as Plugins.Enumeration;
                renderMode = element.renderMode;
                attributes = element.attributes;
                break;
        }

        return (
            <div>
                <EntityMembersHeading
                    heading="Attributes"
                    renderMembers={renderMode.showAttributes}
                    onShowMembersChange={this.handleShowAttributesChange}
                />

                {renderMode.showAttributes && (
                    <EntityMemberList
                        entityMembers={attributes}
                        addNewMemberPlaceholder="New attribute"
                        deleteEntityMemberButtonTitle="Delete attribute"
                        createEntityMember={this.props.createEntityAttribute}
                        updateEntityMember={this.props.updateEntityAttribute}
                        deleteEntityMember={this.props.deleteEntityAttribute}
                    />
                )}
            </div>
        );
    }
}

interface Props {
    entity: Element;
    updateEntityRenderMode: (renderMode: EntityRenderMode) => void;
    createEntityAttribute: (attribute: EntityMember) => void;
    updateEntityAttribute: (attribute: EntityMember) => void;
    deleteEntityAttribute: (memberId: UUID) => void;
}
