import * as React from "react";
import EntityMemberList from "./EntityMemberList";
import EntityMembersHeading from "./EntityMembersHeading";
import Element from './../../../domain/Element';
import { UUID } from './../../../domain/utils/uuid';
import { EntityMember } from '../../../domain/plugins/class/Member';
import * as Plugins from './../../../domain/plugins';

export default class EntityMethods extends React.Component<Props> {
    handleShowMethodsChange = (showMethods: boolean) => {
        // this.props.updateEntityRenderMode({
        //     ...element.renderMode,
        //     showMethods
        // });
    };

    render() {
        const { entity } = this.props;
        let renderMode = { showAttributes: false, showMethods: false };
        let methods: EntityMember[] = [];

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
    updateEntityRenderMode: (renderMode: any) => void;
    createEntityMethod: (method: EntityMember) => void;
    updateEntityMethod: (method: EntityMember) => void;
    deleteEntityMethod: (memberId: UUID) => void;
}
