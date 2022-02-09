import React, { Component, ComponentType } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ClassRelationshipType } from '..';
import { Button } from '../../../components/controls/button/button.js';
import { ColorButton } from '../../../components/controls/color-button/color-button.js';
import { Divider } from '../../../components/controls/divider/divider.js';
import { Dropdown } from '../../../components/controls/dropdown/dropdown.js';
import { ExchangeIcon } from '../../../components/controls/icon/exchange.js';
import { TrashIcon } from '../../../components/controls/icon/trash.js';
import { Textfield } from '../../../components/controls/textfield/textfield.js';
import { Body, Header } from '../../../components/controls/typography/typography.js';
import { I18nContext } from '../../../components/i18n/i18n-context.js';
import { localized } from '../../../components/i18n/localized.js';
import { ModelState } from '../../../components/store/model-state.js';
import { StylePane } from '../../../components/style-pane/style-pane.js';
import { styled } from '../../../components/theme/styles.js';
import { UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository.js';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository.js';
import { AsyncDispatch } from '../../../utils/actions/actions.js';
import { UMLAssociation } from '../../common/uml-association/uml-association.js';

type OwnProps = {
  element: UMLAssociation;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  flip: typeof UMLRelationshipRepository.flip;
  getById: (id: string) => UMLElement | null;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentType<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    flip: UMLRelationshipRepository.flip,
    getById: UMLElementRepository.getById as any as AsyncDispatch<typeof UMLElementRepository.getById>,
  }),
);

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class ClassAssociationComponent extends Component<Props, State> {
  state = { colorOpen: false };

  private toggleColor = () => {
    this.setState((state) => ({
      colorOpen: !state.colorOpen,
    }));
  };

  render() {
    const { element, getById } = this.props;
    const source = element.source && getById(element.source.element);
    const target = element.target && getById(element.target.element);
    if (!source || !target) return null;

    return (
      <div>
        <section>
          <Flex>
            <Header gutter={false} style={{ flexGrow: 1 }}>
              {this.props.translate('popup.association')}
            </Header>
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" onClick={() => this.props.flip(element.id)}>
              <ExchangeIcon />
            </Button>
            <Button color="link" onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <StylePane
            open={this.state.colorOpen}
            element={element}
            onColorChange={this.props.update}
            lineColor
            textColor
          />
          <Divider />
        </section>
        <section>
          <Dropdown value={element.type as keyof typeof ClassRelationshipType} onChange={this.onChange}>
            <Dropdown.Item value={ClassRelationshipType.ClassAggregation}>
              {this.props.translate('packages.ClassDiagram.ClassAggregation')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassUnidirectional}>
              {this.props.translate('packages.ClassDiagram.ClassUnidirectional')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassBidirectional}>
              {this.props.translate('packages.ClassDiagram.ClassBidirectional')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassComposition}>
              {this.props.translate('packages.ClassDiagram.ClassComposition')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassDependency}>
              {this.props.translate('packages.ClassDiagram.ClassDependency')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassInheritance}>
              {this.props.translate('packages.ClassDiagram.ClassInheritance')}
            </Dropdown.Item>
            <Dropdown.Item value={ClassRelationshipType.ClassRealization}>
              {this.props.translate('packages.ClassDiagram.ClassRealization')}
            </Dropdown.Item>
          </Dropdown>
          <Divider />
        </section>
        <section>
          <Header>{source.name}</Header>
          <Flex>
            <Body style={{ marginRight: '0.5em' }}>{this.props.translate('popup.multiplicity')}</Body>
            <Textfield
              style={{ minWidth: 0 }}
              gutter
              value={element.source.multiplicity}
              onChange={this.onUpdate('multiplicity', 'source')}
              autoFocus
            />
          </Flex>
          <Flex>
            <Body style={{ marginRight: '0.5em' }}>{this.props.translate('popup.role')}</Body>
            <Textfield value={element.source.role} onChange={this.onUpdate('role', 'source')} />
          </Flex>
          <Divider />
        </section>
        <section>
          <Header>{target.name}</Header>
          <Flex>
            <Body style={{ marginRight: '0.5em' }}>{this.props.translate('popup.multiplicity')}</Body>
            <Textfield
              style={{ minWidth: 0 }}
              gutter
              value={element.target.multiplicity}
              onChange={this.onUpdate('multiplicity', 'target')}
            />
          </Flex>
          <Flex>
            <Body style={{ marginRight: '0.5em' }}>{this.props.translate('popup.role')}</Body>
            <Textfield value={element.target.role} onChange={this.onUpdate('role', 'target')} />
          </Flex>
        </section>
      </div>
    );
  }
  private onChange = (type: keyof typeof ClassRelationshipType) => {
    const { element, update } = this.props;
    update(element.id, { type });
  };

  private onUpdate = (type: 'multiplicity' | 'role', end: 'source' | 'target') => (value: string) => {
    const { element, update } = this.props;
    update<UMLAssociation>(element.id, { [end]: { ...element[end], [type]: value } });
  };
}

export const UMLClassAssociationUpdate = enhance(ClassAssociationComponent);
