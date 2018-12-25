import * as React from "react";
import EntityMemberList from "./EntityMemberList";
import EntityMembersHeading from "./EntityMembersHeading";
import Element from './../../../domain/Element';
import { UUID } from './../../../domain/utils/uuid';
import { EntityMember } from '../../../domain/plugins/class/Member';

export default class EntityAttributes extends React.Component<Props> {
    handleShowAttributesChange = (showAttributes: boolean) => {
        // this.props.updateEntityRenderMode({
        //     ...element.renderMode,
        //     showAttributes
        // });
    };

    render() {
        const { entity } = this.props;
        let renderMode = { showAttributes: false, showMethods: false };
        let attributes: EntityMember[] = [];

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
    updateEntityRenderMode: (renderMode: any) => void;
    createEntityAttribute: (attribute: EntityMember) => void;
    updateEntityAttribute: (attribute: EntityMember) => void;
    deleteEntityAttribute: (memberId: UUID) => void;
}
