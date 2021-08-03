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
import { UMLActivityMergeNode } from './uml-activity-merge-node';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class ActivityMergeNodeUpdate extends Component<Props, State> {
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
  element: UMLActivityMergeNode;
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

export const UMLActivityMergeNodeUpdate = enhance(ActivityMergeNodeUpdate);
