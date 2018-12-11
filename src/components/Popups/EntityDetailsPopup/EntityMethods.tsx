import * as React from "react";
import EntityMemberList from "./EntityMemberList";
import EntityMembersHeading from "./EntityMembersHeading";
import { EntityRenderMode, EntityKind } from "./../../../core/domain";
import Element from './../../../domain/Element';
import { UUID } from './../../../domain/utils/uuid';
import { EntityMember } from '../../../domain/plugins/class/Member';
import * as Plugins from './../../../domain/plugins';

export default class EntityMethods extends React.Component<Props> {
    handleShowMethodsChange = (showMethods: boolean) => {
        let renderMode = { showAttributes: false, showMethods: false };
        let element;
        switch (this.props.entity.kind) {
            case EntityKind.Class:
                element = this.props.entity as Plugins.Class;
                renderMode = element.renderMode;
                break;
            case EntityKind.AbstractClass:
                element = this.props.entity as Plugins.AbstractClass;
                renderMode = element.renderMode;
                break;
            case EntityKind.Interface:
                element = this.props.entity as Plugins.Interface;
                renderMode = element.renderMode;
                break;
            case EntityKind.Enumeration:
                element = this.props.entity as Plugins.Enumeration;
                renderMode = element.renderMode;
                break;
        }
        this.props.updateEntityRenderMode({
            ...renderMode,
            showMethods
        });
    };

    render() {
        const { entity } = this.props;
        let renderMode = { showAttributes: false, showMethods: false };
        let methods: EntityMember[] = [];
        let element;
        switch (entity.kind) {
            case EntityKind.Class:
                element = entity as Plugins.Class;
                renderMode = element.renderMode;
                methods = element.methods;
                break;
            case EntityKind.AbstractClass:
                element = entity as Plugins.AbstractClass;
                renderMode = element.renderMode;
                methods = element.methods;
                break;
            case EntityKind.Interface:
                element = entity as Plugins.Interface;
                renderMode = element.renderMode;
                methods = element.methods;
                break
            case EntityKind.Enumeration:
                element = entity as Plugins.Enumeration;
                renderMode = element.renderMode;
                break;
        }

        return (
            <div>
                <EntityMembersHeading
                    heading="Methods"
                    renderMembers={renderMode.showMethods}
                    onShowMembersChange={this.handleShowMethodsChange}
                />

                {renderMode.showMethods && (
                    <EntityMemberList
                        entityMembers={methods}
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
    entity: Element;
    updateEntityRenderMode: (renderMode: EntityRenderMode) => void;
    createEntityMethod: (method: EntityMember) => void;
    updateEntityMethod: (method: EntityMember) => void;
    deleteEntityMethod: (memberId: UUID) => void;
}
