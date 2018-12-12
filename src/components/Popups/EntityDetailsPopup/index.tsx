import * as React from "react";
import { connect } from "react-redux";
import EntityDetails from "./EntityDetails";
import Popup from "../Popup";
import { createEntityAttribute, createEntityMethod, deleteEntityMember, updateEntityKind, updateEntityMember, updateEntityName, updateEntityRenderMode } from "./../../../gui/redux";
import { EntityKind, EntityRenderMode } from "./../../../core/domain";
import { Point } from "./../../../core/geometry";
import { UUID } from './../../../domain/utils/uuid';
import { EntityMember } from '../../../domain/plugins/class/Member';
import Element, { ElementRepository } from './../../../domain/Element';
import * as Plugins from './../../../domain/plugins';
import { computeEntityHeight } from "../../../rendering/layouters/entity";

class EntityDetailsPopup extends React.Component<Props> {
    updateEntityKind = (kind: EntityKind) => {
        this.props.updateEntityKind(this.props.entity.id, kind);
    };

    updateEntityName = (name: string) => {
        const element: Element = {
            ...this.props.entity,
            name,
        };
        this.props.update(element);

        this.props.updateEntityName(this.props.entity.id, name);
    };

    updateEntityRenderMode = (renderMode: EntityRenderMode) => {
        let element: any;
        switch (this.props.entity.kind) {
            case EntityKind.Class:
                element = this.props.entity as Plugins.Class;
                element.renderMode = renderMode;
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.AbstractClass:
                element = this.props.entity as Plugins.AbstractClass;
                element.renderMode = renderMode;
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Interface:
                element = this.props.entity as Plugins.Interface;
                element.renderMode = renderMode;
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Enumeration:
                element = this.props.entity as Plugins.Enumeration;
                element.renderMode = renderMode;
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    0,
                    element.renderMode
                )
                break;
        }
        this.props.update(element);

        this.props.updateEntityRenderMode(this.props.entity.id, renderMode);
    };

    createEntityAttribute = (attribute: EntityMember) => {
        let element: any;
        switch (this.props.entity.kind) {
            case EntityKind.Class:
                element = this.props.entity as Plugins.Class;
                element.attributes = [...element.attributes, attribute];
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.AbstractClass:
                element = this.props.entity as Plugins.AbstractClass;
                element.attributes = [...element.attributes, attribute];
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Interface:
                element = this.props.entity as Plugins.Interface;
                element.attributes = [...element.attributes, attribute];
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Enumeration:
                element = this.props.entity as Plugins.Enumeration;
                element.attributes = [...element.attributes, attribute];
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    0,
                    element.renderMode
                )
                break;
        }
        this.props.update(element);

        this.props.createEntityAttribute(this.props.entity.id, attribute);
    };

    createEntityMethod = (method: EntityMember) => {
        let element: any;
        switch (this.props.entity.kind) {
            case EntityKind.Class:
                element = this.props.entity as Plugins.Class;
                element.methods = [...element.methods, method];
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.AbstractClass:
                element = this.props.entity as Plugins.AbstractClass;
                element.methods = [...element.methods, method];
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Interface:
                element = this.props.entity as Plugins.Interface;
                element.methods = [...element.methods, method];
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Enumeration:
                element = this.props.entity as Plugins.Enumeration;
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    0,
                    element.renderMode
                )
                break;
        }
        this.props.update(element);

        this.props.createEntityMethod(this.props.entity.id, method);
    };

    updateEntityMember = (member: EntityMember) => {
        let element: any;
        switch (this.props.entity.kind) {
            case EntityKind.Class:
                element = this.props.entity as Plugins.Class;
                element.attributes = element.attributes.map(
                    (attr: EntityMember) => (attr.id === member.id ? member : attr)
                );
                element.methods = element.methods.map(
                    (method: EntityMember) => (method.id === member.id ? member : method)
                );
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.AbstractClass:
                element = this.props.entity as Plugins.AbstractClass;
                element.attributes = element.attributes.map(
                    (attr: EntityMember) => (attr.id === member.id ? member : attr)
                );
                element.methods = element.methods.map(
                    (method: EntityMember) => (method.id === member.id ? member : method)
                );
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Interface:
                element = this.props.entity as Plugins.Interface;
                element.attributes = element.attributes.map(
                    (attr: EntityMember) => (attr.id === member.id ? member : attr)
                );
                element.methods = element.methods.map(
                    (method: EntityMember) => (method.id === member.id ? member : method)
                );
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Enumeration:
                element = this.props.entity as Plugins.Enumeration;
                element.attributes = element.attributes.map(
                    (attr: EntityMember) => (attr.id === member.id ? member : attr)
                );
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    0,
                    element.renderMode
                )
                break;
        }
        this.props.update(element);

        this.props.updateEntityMember(this.props.entity.id, member);
    };

    deleteEntityMember = (memberId: UUID) => {
        let element: any;
        switch (this.props.entity.kind) {
            case EntityKind.Class:
                element = this.props.entity as Plugins.Class;
                element.attributes = element.attributes.filter(
                    (attr: EntityMember) => (attr.id !== memberId)
                );
                element.methods = element.methods.filter(
                    (method: EntityMember) => (method.id !== memberId)
                );
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.AbstractClass:
                element = this.props.entity as Plugins.AbstractClass;
                element.attributes = element.attributes.filter(
                    (attr: EntityMember) => (attr.id !== memberId)
                );
                element.methods = element.methods.filter(
                    (method: EntityMember) => (method.id !== memberId)
                );
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Interface:
                element = this.props.entity as Plugins.Interface;
                element.attributes = element.attributes.filter(
                    (attr: EntityMember) => (attr.id !== memberId)
                );
                element.methods = element.methods.filter(
                    (method: EntityMember) => (method.id !== memberId)
                );
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    element.methods.length,
                    element.renderMode
                )
                break;
            case EntityKind.Enumeration:
                element = this.props.entity as Plugins.Enumeration;
                element.attributes = element.attributes.filter(
                    (attr: EntityMember) => (attr.id !== memberId)
                );
                element.bounds.height = computeEntityHeight(
                    element.kind,
                    element.attributes.length,
                    0,
                    element.renderMode
                )
                break;
        }
        this.props.update(element);

        this.props.deleteEntityMember(this.props.entity.id, memberId);
    };

    render() {
        const { entity } = this.props;

        const position: Point = {
            x: entity.bounds.x + entity.bounds.width + 22,
            y: entity.bounds.y - 20
        };

        return (
            <Popup position={position} onRequestClose={this.props.onRequestClose} canvasScrollContainer={this.props.canvasScrollContainer}>
                <EntityDetails
                    entity={entity}
                    updateEntityKind={this.updateEntityKind}
                    updateEntityName={this.updateEntityName}
                    updateEntityRenderMode={this.updateEntityRenderMode}
                    createEntityAttribute={this.createEntityAttribute}
                    createEntityMethod={this.createEntityMethod}
                    updateEntityMember={this.updateEntityMember}
                    deleteEntityMember={this.deleteEntityMember}
                />
            </Popup>
        );
    }
}

interface OwnProps {
    entity: Element;
    onRequestClose: () => void;
    canvasScrollContainer: HTMLDivElement | null;
}

interface DispatchProps {
    update: typeof ElementRepository.update;
    updateEntityKind: typeof updateEntityKind;
    updateEntityName: typeof updateEntityName;
    updateEntityRenderMode: typeof updateEntityRenderMode;
    createEntityAttribute: typeof createEntityAttribute;
    createEntityMethod: typeof createEntityMethod;
    updateEntityMember: typeof updateEntityMember;
    deleteEntityMember: typeof deleteEntityMember;
}

type Props = OwnProps & DispatchProps;

export default connect(null, {
    update: ElementRepository.update,
    updateEntityKind,
    updateEntityName,
    updateEntityRenderMode,
    createEntityAttribute,
    createEntityMethod,
    updateEntityMember,
    deleteEntityMember
})(EntityDetailsPopup);
