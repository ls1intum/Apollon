import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { UseCaseRelationshipType } from '..';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { Dropdown } from '../../../components/controls/dropdown/dropdown';
import { ExchangeIcon } from '../../../components/controls/icon/exchange';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ElementRepository } from '../../../services/element/element-repository';
import { RelationshipRepository } from '../../../services/relationship/relationship-repository';
import { ModelState } from './../../../components/store/model-state';
import { UseCaseAssociation } from './use-case-association';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class UseCaseAssociationComponent extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          {element.type === UseCaseRelationshipType.UseCaseAssociation ? (
            <Textfield value={element.name} onChange={this.rename(element.id)} />
          ) : (
            <Flex>
              <Header gutter={false}>
                {
                  {
                    [UseCaseRelationshipType.UseCaseAssociation]: this.props.translate(
                      'packages.useCaseDiagram.association',
                    ),
                    [UseCaseRelationshipType.UseCaseGeneralization]: this.props.translate(
                      'packages.useCaseDiagram.generalization',
                    ),
                    [UseCaseRelationshipType.UseCaseInclude]: this.props.translate('packages.useCaseDiagram.include'),
                    [UseCaseRelationshipType.UseCaseExtend]: this.props.translate('packages.useCaseDiagram.extend'),
                  }[element.type]
                }
              </Header>
              <Button color="link">
                <ExchangeIcon onClick={() => this.props.flip(element.id)} />
              </Button>
            </Flex>
          )}
          <Divider />
        </section>
        <section>
          <Dropdown value={element.type} onChange={this.onChange}>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseAssociation}>
              {this.props.translate('packages.useCaseDiagram.association')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseGeneralization}>
              {this.props.translate('packages.useCaseDiagram.generalization')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseInclude}>
              {this.props.translate('packages.useCaseDiagram.include')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseExtend}>
              {this.props.translate('packages.useCaseDiagram.extend')}
            </Dropdown.Item>
          </Dropdown>
        </section>
      </div>
    );
  }
  private rename = (id: string) => (value: string) => {
    this.props.rename(id, value);
  };

  private onChange = (value: UseCaseRelationshipType) => {
    const { element, change } = this.props;
    change(element.id, value);
  };
}

type OwnProps = {
  element: UseCaseAssociation;
};

type StateProps = {};

type DispatchProps = {
  rename: typeof ElementRepository.rename;
  change: typeof ElementRepository.change;
  update: typeof ElementRepository.update;
  flip: typeof RelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    null,
    {
      rename: ElementRepository.rename,
      change: ElementRepository.change,
      update: ElementRepository.update,
      flip: RelationshipRepository.flip,
    },
  ),
);

export const UseCaseAssociationPopup = enhance(UseCaseAssociationComponent);
