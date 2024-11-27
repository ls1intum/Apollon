import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Button } from '../../../components/controls/button/button';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { Divider } from '../../../components/controls/divider/divider';
import { ArrowRightIcon } from '../../../components/controls/icon/arrow-right';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Body, Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { StylePane } from '../../../components/style-pane/style-pane';
import { styled } from '../../../components/theme/styles';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { UMLStateMergeNode } from './uml-state-merge-node';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const SizeInput = styled.input`
  padding: 4px 8px;
  border: 1px solid ${(props) => props.theme.color.gray};
  border-radius: 4px;
  width: 80px;
  
  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.color.primary};
  }
`;

type State = { colorOpen: boolean };

class StateMergeNodeUpdate extends Component<Props, State> {
  state = { colorOpen: false };

  private toggleColor = () => {
    this.setState((state) => ({
      colorOpen: !state.colorOpen,
    }));
  };

  private onUpdate = (name: string) => {
    const { element, update } = this.props;
    update(element.id, { name });
  };

  private onUpdateOption = (id: string) => (name: string) => {
    const { update } = this.props;
    update(id, { name });
  };

  private onUpdateSize = (dimension: 'width' | 'height') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      const { element, update } = this.props;
      update(element.id, {
        bounds: {
          ...element.bounds,
          [dimension]: value
        }
      });
    }
  };

  render() {
    const { element, decisions, targets, update } = this.props;
    return (
      <div>
        <section>
          <Flex>
            <Textfield value={element.name} onChange={this.onUpdate} />
            <ColorButton onClick={this.toggleColor} />
          </Flex>
          <StylePane
            open={this.state.colorOpen}
            element={element}
            onColorChange={update}
            fillColor
            lineColor
            textColor
          />
          <Controls>
            <div>
              <span>{this.props.translate('common.width')}</span>
              <SizeInput
                type="number"
                value={element.bounds.width}
                onChange={this.onUpdateSize('width')}
                min={50}
                max={1000}
              />
            </div>
            <div>
              <span>{this.props.translate('common.height')}</span>
              <SizeInput
                type="number"
                value={element.bounds.height}
                onChange={this.onUpdateSize('height')}
                min={50}
                max={1000}
              />
            </div>
          </Controls>
        </section>

        <section>
          {decisions.length > 0 && (
            <>
              <Divider />
              <Header>{this.props.translate('popup.condition')}</Header>

              {decisions.map((decision, i) => (
                <Flex key={decision.id}>
                  <Textfield
                    gutter={i < decisions.length - 1}
                    value={decision.name}
                    onChange={this.onUpdateOption(decision.id)}
                  />
                  <Button color="link" disabled>
                    <ArrowRightIcon />
                  </Button>
                  <Body>{targets[i].name}</Body>
                </Flex>
              ))}
            </>
          )}
        </section>
      </div>
    );
  }
}

type OwnProps = {
  element: UMLStateMergeNode;
};

type StateProps = {
  decisions: IUMLRelationship[];
  targets: IUMLElement[];
};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  getById: (id: string) => UMLElement | null;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => {
      const decisions = Object.values(state.elements)
        .filter((x): x is IUMLRelationship => UMLRelationship.isUMLRelationship(x))
        .filter((x) => x.source.element === props.element.id);

      return {
        decisions,
        targets: decisions.map((relationship) => state.elements[relationship.target.element]),
      };
    },
    {
      update: UMLElementRepository.update,
      getById: UMLElementRepository.getById as any as AsyncDispatch<typeof UMLElementRepository.getById>,
    },
  ),
);

export const UMLStateMergeNodeUpdate = enhance(StateMergeNodeUpdate); 