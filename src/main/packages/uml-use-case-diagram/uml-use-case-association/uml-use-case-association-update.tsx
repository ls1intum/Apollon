import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { UseCaseRelationshipType } from '..';
import { Button } from '../../../components/controls/button/button';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { Divider } from '../../../components/controls/divider/divider';
import { Dropdown } from '../../../components/controls/dropdown/dropdown';
import { ExchangeIcon } from '../../../components/controls/icon/exchange';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { StylePane } from '../../../components/style-pane/style-pane';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { UMLUseCaseExtend } from '../uml-use-case-extend/uml-use-case-extend';
import { UMLUseCaseGeneralization } from '../uml-use-case-generalization/uml-use-case-generalization';
import { UMLUseCaseInclude } from '../uml-use-case-include/uml-use-case-include';
import { UMLUseCaseAssociation } from './uml-use-case-association';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class UseCaseAssociationUpdate extends Component<Props, State> {
  state = { colorOpen: false };

  private toggleColor = () => {
    this.setState((state) => ({
      colorOpen: !state.colorOpen,
    }));
  };

  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          {element.type === UseCaseRelationshipType.UseCaseAssociation ? (
            <Flex>
              <Textfield value={element.name} placeholder="..." onChange={this.rename(element.id)} autoFocus />
              <ColorButton onClick={this.toggleColor} />
              <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
                <TrashIcon />
              </Button>
            </Flex>
          ) : (
            <Flex>
              <Header gutter={false} style={{ flexGrow: 1 }}>
                {
                  {
                    [UseCaseRelationshipType.UseCaseAssociation]: this.props.translate(
                      'packages.UseCaseDiagram.UseCaseAssociation',
                    ),
                    [UseCaseRelationshipType.UseCaseGeneralization]: this.props.translate(
                      'packages.UseCaseDiagram.UseCaseGeneralization',
                    ),
                    [UseCaseRelationshipType.UseCaseInclude]: this.props.translate(
                      'packages.UseCaseDiagram.UseCaseInclude',
                    ),
                    [UseCaseRelationshipType.UseCaseExtend]: this.props.translate(
                      'packages.UseCaseDiagram.UseCaseExtend',
                    ),
                  }[element.type]
                }
              </Header>
              <ColorButton onClick={this.toggleColor} />
              <Button color="link" tabIndex={-1} onClick={() => this.props.flip(element.id)}>
                <ExchangeIcon />
              </Button>
              <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
                <TrashIcon />
              </Button>
            </Flex>
          )}
        </section>
        <section>
          <Divider />
          <Dropdown value={element.type} onChange={this.onChange}>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseAssociation}>
              {this.props.translate('packages.UseCaseDiagram.UseCaseAssociation')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseGeneralization}>
              {this.props.translate('packages.UseCaseDiagram.UseCaseGeneralization')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseInclude}>
              {this.props.translate('packages.UseCaseDiagram.UseCaseInclude')}
            </Dropdown.Item>
            <Dropdown.Item value={UseCaseRelationshipType.UseCaseExtend}>
              {this.props.translate('packages.UseCaseDiagram.UseCaseExtend')}
            </Dropdown.Item>
          </Dropdown>
        </section>
        <StylePane
          open={this.state.colorOpen}
          element={element}
          onColorChange={this.props.update}
          lineColor
          textColor={element.type !== UseCaseRelationshipType.UseCaseGeneralization}
        />
      </div>
    );
  }
  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  private onChange = (type: keyof typeof UseCaseRelationshipType) => {
    const { element, update } = this.props;
    update(element.id, { type });
  };
}

type OwnProps = {
  element: UMLUseCaseAssociation | UMLUseCaseGeneralization | UMLUseCaseInclude | UMLUseCaseExtend;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  flip: typeof UMLRelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    flip: UMLRelationshipRepository.flip,
  }),
);

export const UMLUseCaseAssociationUpdate = enhance(UseCaseAssociationUpdate);
