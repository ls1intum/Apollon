import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ColorLegendElement } from '.';
import { Button } from '../../../components/controls/button/button.js';
import { ColorButton } from '../../../components/controls/color-button/color-button.js';
import { TrashIcon } from '../../../components/controls/icon/trash.js';
import { Textfield } from '../../../components/controls/textfield/textfield.js';
import { I18nContext } from '../../../components/i18n/i18n-context.js';
import { localized } from '../../../components/i18n/localized.js';
import { ModelState } from '../../../components/store/model-state.js';
import { StylePane } from '../../../components/style-pane/style-pane.js';
import { styled } from '../../../components/theme/styles.js';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository.js';
import { AsyncDispatch } from '../../../utils/actions/actions.js';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class ColorLegendUpdateComponent extends Component<Props, State> {
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
            <Textfield
              value={element.name}
              placeholder={this.props.translate('packages.SyntaxTree.SyntaxTreeNonterminal')}
              onChange={this.onUpdate}
              autoFocus
            />
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
        </section>
        <StylePane
          open={this.state.colorOpen}
          element={element}
          onColorChange={this.props.update}
          lineColor
          textColor
          fillColor
        />
      </div>
    );
  }
  private onUpdate = (name: string) => {
    const { element, update } = this.props;
    update(element.id, { name });
  };
}

type OwnProps = {
  element: ColorLegendElement;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: AsyncDispatch<typeof UMLElementRepository.delete>;
};

export type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
  }),
);

export const ColorLegendUpdate = enhance(ColorLegendUpdateComponent);
