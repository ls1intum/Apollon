import * as React from "react";
import { connect } from "react-redux";
import EntityDetails from "./EntityDetails";
import Popup from "../Popup";
import {
    createEntityAttribute,
    createEntityMethod,
    deleteEntityMember,
    updateEntityKind,
    updateEntityMember,
    updateEntityName,
    updateEntityRenderMode
} from "../../../../redux";
import { Entity, EntityKind, EntityMember, EntityRenderMode } from "../../../../../core/domain";
import { Point } from "../../../../../core/geometry";
import { UUID } from "../../../../../core/utils";

class EntityDetailsPopup extends React.Component<Props> {
    updateEntityKind = (kind: EntityKind) => {
        this.props.updateEntityKind(this.props.entity.id, kind);
    };

    updateEntityName = (name: string) => {
        this.props.updateEntityName(this.props.entity.id, name);
    };

    updateEntityRenderMode = (renderMode: EntityRenderMode) => {
        this.props.updateEntityRenderMode(this.props.entity.id, renderMode);
    };

    createEntityAttribute = (attribute: EntityMember) => {
        this.props.createEntityAttribute(this.props.entity.id, attribute);
    };

    createEntityMethod = (method: EntityMember) => {
        this.props.createEntityMethod(this.props.entity.id, method);
    };

    updateEntityMember = (member: EntityMember) => {
        this.props.updateEntityMember(this.props.entity.id, member);
    };

    deleteEntityMember = (memberId: UUID) => {
        this.props.deleteEntityMember(this.props.entity.id, memberId);
    };

    render() {
        const { entity } = this.props;

        const position: Point = {
            x: entity.position.x + entity.size.width + 22,
            y: entity.position.y - 20
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
    entity: Entity;
    onRequestClose: () => void;
    canvasScrollContainer: HTMLDivElement | null;
}

interface DispatchProps {
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
    updateEntityKind,
    updateEntityName,
    updateEntityRenderMode,
    createEntityAttribute,
    createEntityMethod,
    updateEntityMember,
    deleteEntityMember
})(EntityDetailsPopup);
