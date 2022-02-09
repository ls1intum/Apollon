import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { Button } from '../../../components/controls/button/button.js';
import { Divider } from '../../../components/controls/divider/divider.js';
import { ExchangeIcon } from '../../../components/controls/icon/exchange.js';
import { TrashIcon } from '../../../components/controls/icon/trash.js';
import { Textfield } from '../../../components/controls/textfield/textfield.js';
import { Header } from '../../../components/controls/typography/typography.js';
import { I18nContext } from '../../../components/i18n/i18n-context.js';
import { localized } from '../../../components/i18n/localized.js';
import { ModelState } from '../../../components/store/model-state.js';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository.js';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository.js';
import { UMLActivityControlFlow } from './uml-activity-control-flow.js';
import { ColorButton } from '../../../components/controls/color-button/color-button.js';
import { StylePane } from '../../../components/style-pane/style-pane.js';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class ActivityControlFlowUpdate extends Component<Props, State> {
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
            <Header gutter={false} style={{ flexGrow: 1 }}>
              {this.props.translate('packages.ActivityDiagram.ActivityControlFlow')}
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
          <Textfield value={element.name} onChange={this.rename} autoFocus />
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
    this.props.update(this.props.element.id, { name });
  };
}

type OwnProps = {
  element: UMLActivityControlFlow;
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

export const UMLActivityControlFlowUpdate = enhance(ActivityControlFlowUpdate);
