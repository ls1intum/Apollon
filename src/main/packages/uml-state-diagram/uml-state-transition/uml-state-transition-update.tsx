import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { ExchangeIcon } from '../../../components/controls/icon/exchange';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { UMLStateTransition, IUMLStateTransition } from './uml-state-transition';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { StylePane } from '../../../components/style-pane/style-pane';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

const ParamContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const ParamControls = styled.div`
  display: flex;
  gap: 4px;
`;

type State = { 
  colorOpen: boolean;
  paramIds: string[];
};

type OwnProps = {
  element: UMLStateTransition;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  flip: typeof UMLRelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

class StateTransitionUpdate extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      colorOpen: false,
      paramIds: Object.keys(props.element.params).length > 0 
        ? Object.keys(props.element.params).sort() 
        : ['0']
    };
  }

  private toggleColor = () => {
    this.setState((state) => ({
      colorOpen: !state.colorOpen,
    }));
  };

  private addParam = () => {
    const newId = (Math.max(...this.state.paramIds.map(Number)) + 1).toString();
    this.setState(
      prevState => ({ paramIds: [...prevState.paramIds, newId] }),
      () => {
        const newParams = { ...this.props.element.params, [newId]: '' };
        this.props.update<UMLStateTransition>(this.props.element.id, { params: newParams });
      }
    );
  };

  private removeParam = (id: string) => {
    this.setState(
      prevState => ({
        paramIds: prevState.paramIds.filter(paramId => paramId !== id)
      }),
      () => {
        const newParams = { ...this.props.element.params };
        delete newParams[id];
        this.props.update<UMLStateTransition>(this.props.element.id, { params: newParams });
      }
    );
  };

  private handleParamChange = (id: string, value: string) => {
    const newParams = { ...this.props.element.params, [id]: value };
    this.props.update<UMLStateTransition>(this.props.element.id, { params: newParams });
  };

  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          <Flex>
            <Header gutter={false} style={{ flexGrow: 1 }}>
              {this.props.translate('packages.StateDiagram.StateTransition')}
            </Header>
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" onClick={() => this.props.flip(element.id)}>
              <ExchangeIcon />
            </Button>
            <Button color="link" onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <Divider />
        </section>
        <section>
          <Header>Name</Header>
          <Textfield value={element.name} onChange={this.rename} autoFocus />
        </section>
        <section>
          <Flex>
            <Header>Parameters</Header>
            <Button color="link" onClick={this.addParam}>
              Add
            </Button>
          </Flex>
          {this.state.paramIds.map((id, index) => (
            <ParamContainer key={index}>
              <Textfield
                value={this.props.element.params[id]}
                onChange={(value) => this.handleParamChange(id, value)}
                placeholder={`Parameter ${index + 1}`}
              />
              {this.state.paramIds.length > 1 && (
                <ParamControls>
                  <Button color="link" onClick={() => this.removeParam(id)}>
                  <TrashIcon />
                  </Button>
                </ParamControls>
              )}
            </ParamContainer>
          ))}
        </section>
        <StylePane
          open={this.state.colorOpen}
          element={element}
          onColorChange={this.props.update}
          lineColor
          textColor
        />
      </div>
    );
  }

  private rename = (name: string) => {
    this.props.update<UMLStateTransition>(this.props.element.id, { name });
  };
}

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    flip: UMLRelationshipRepository.flip,
  }),
);

export const UMLStateTransitionUpdate = enhance(StateTransitionUpdate); 