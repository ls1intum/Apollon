import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ColorLegendElement, IColorLegendElement } from '.';
import { Button } from '../../../components/controls/button/button';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { StylePane } from '../../../components/style-pane/style-pane';
import { styled } from '../../../components/theme/styles';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { IUMLElement } from '../../../services/uml-element/uml-element';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid ${(props) => props.theme.color.gray};
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  font-size: inherit;
  
  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.color.primary};
  }
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
          <TextArea
            value={element.text}
            placeholder={this.props.translate('packages.SyntaxTree.SyntaxTreeNonterminal')}
            onChange={(e) => this.onUpdate(e.target.value)}
            autoFocus
          />
          <Flex>
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
  private onUpdate = (text: string) => {
    const { element, update } = this.props;
    update(element.id, { text });
  };
}

type OwnProps = {
  element: ColorLegendElement;
};

type StateProps = {};

type DispatchProps = {
  update: (id: string, values: Partial<IColorLegendElement>) => void;
  delete: AsyncDispatch<typeof UMLElementRepository.delete>;
};

export type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: (id: string, values: Partial<IColorLegendElement>) => 
      UMLElementRepository.update(id, values as Partial<IUMLElement>),
    delete: UMLElementRepository.delete,
  }),
);

export const ColorLegendUpdate = enhance(ColorLegendUpdateComponent);
