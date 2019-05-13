import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ComponentRelationshipType } from '.';
import { Button } from '../../components/controls/button/button';
import { Divider } from '../../components/controls/divider/divider';
import { Dropdown } from '../../components/controls/dropdown/dropdown';
import { ExchangeIcon } from '../../components/controls/icon/exchange';
import { TrashIcon } from '../../components/controls/icon/trash';
import { Header } from '../../components/controls/typography/typography';
import { I18nContext } from '../../components/i18n/i18n-context';
import { localized } from '../../components/i18n/localized';
import { ModelState } from '../../components/store/model-state';
import { styled } from '../../components/theme/styles';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { RelationshipRepository } from '../../services/relationship/relationship-repository';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class ComponentAssociationPopupComponent extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          <Flex>
            <Header gutter={false} style={{ flexGrow: 1 }}>
              {this.props.translate('popup.association')}
            </Header>
            <Button color="link" onClick={() => this.props.flip(element.id)}>
              <ExchangeIcon />
            </Button>
            <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <Divider />
        </section>
        <section>
          <Dropdown value={element.type as ComponentRelationshipType} onChange={this.onChange}>
            <Dropdown.Item value={ComponentRelationshipType.ComponentDependency}>
              {this.props.translate('packages.componentDiagram.dependency')}
            </Dropdown.Item>
            <Dropdown.Item value={ComponentRelationshipType.ComponentInterfaceProvided}>
              {this.props.translate('packages.componentDiagram.interfaceProvided')}
            </Dropdown.Item>
            <Dropdown.Item value={ComponentRelationshipType.ComponentInterfaceRequired}>
              {this.props.translate('packages.componentDiagram.interfaceRequired')}
            </Dropdown.Item>
          </Dropdown>
        </section>
      </div>
    );
  }

  private onChange = (value: ComponentRelationshipType) => {
    const { element, change } = this.props;
    change(element.id, value);
  };
}

type OwnProps = {
  element: Element;
};

type StateProps = {};

type DispatchProps = {
  change: typeof ElementRepository.change;
  delete: typeof ElementRepository.delete;
  flip: typeof RelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    null,
    {
      change: ElementRepository.change,
      delete: ElementRepository.delete,
      flip: RelationshipRepository.flip,
    },
  ),
);

export const ComponentAssociationPopup = enhance(ComponentAssociationPopupComponent);
