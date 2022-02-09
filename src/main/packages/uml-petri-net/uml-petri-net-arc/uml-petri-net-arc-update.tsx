import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Button } from '../../../components/controls/button/button.js';
import { TrashIcon } from '../../../components/controls/icon/trash.js';
import { Textfield } from '../../../components/controls/textfield/textfield.js';
import { I18nContext } from '../../../components/i18n/i18n-context.js';
import { localized } from '../../../components/i18n/localized.js';
import { ModelState } from '../../../components/store/model-state.js';
import { styled } from '../../../components/theme/styles.js';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository.js';
import { UMLPetriNetArc } from './uml-petri-net-arc.js';
import { ExchangeIcon } from '../../../components/controls/icon/exchange.js';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository.js';
import { ColorButton } from '../../../components/controls/color-button/color-button.js';
import { StylePane } from '../../../components/style-pane/style-pane.js';

interface OwnProps {
  element: UMLPetriNetArc;
}

type StateProps = {};

interface DispatchProps {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  flip: typeof UMLRelationshipRepository.flip;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    flip: UMLRelationshipRepository.flip,
  }),
);

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class UMLPetriNetArcUpdateComponent extends Component<Props, State> {
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
          <Flex>
            <Textfield value={element.name} onChange={this.rename(element.id)} autoFocus />
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" onClick={() => this.props.flip(element.id)}>
              <ExchangeIcon />
            </Button>
            <Button color="link" tabIndex={-1} onClick={this.delete(element.id)}>
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
        </section>
      </div>
    );
  }

  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const UMLPetriNetArcUpdate = enhance(UMLPetriNetArcUpdateComponent);
