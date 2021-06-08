import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { styled } from '../../../components/theme/styles';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLPetriNetPlace } from './uml-petri-net-place';
import { Body } from '../../../components/controls/typography/typography';
import { InfiniteIcon } from '../../../components/controls/icon/infinite';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { StylePane } from '../../../components/style-pane/style-pane';

interface OwnProps {
  element: UMLPetriNetPlace;
}

type StateProps = {};

interface DispatchProps {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
  }),
);

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class UmlPetriNetPlaceUpdateComponent extends Component<Props, State> {
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
            fillColor
          />
          <Divider />
        </section>
        <section>
          <Flex>
            <Body style={{ marginRight: '0.5em', minWidth: '70px' }}>{this.props.translate('popup.tokens')}</Body>
            {/*Textfield minWidth=0 is fix for firefox not to overflow the element*/}
            <Textfield
              style={{ minWidth: 0 }}
              value={element.amountOfTokens}
              type="number"
              onChange={this.changeTokenAmount(element.id)}
            />
          </Flex>
        </section>
        <section>
          <Flex style={{ marginTop: '0.5em', alignItems: 'center' }}>
            <Body style={{ marginRight: '0.5em', minWidth: '70px' }}>{this.props.translate('popup.capacity')}</Body>
            <div style={{ position: 'relative' }}>
              <Textfield value={element.capacity} type="number" onChange={this.changeCapacity(element.id)} />
              {!isFinite(element.capacity) && (
                <InfiniteIcon style={{ position: 'absolute', top: '25%', left: '5%' }} key={element.capacity} />
              )}
            </div>
            <Button
              color="link"
              type="reset"
              tabIndex={-1}
              onClick={(event) => this.changeCapacity(element.id)(Number.POSITIVE_INFINITY)}
            >
              <InfiniteIcon />
            </Button>
          </Flex>
        </section>
      </div>
    );
  }

  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  private changeTokenAmount = (id: string) => (value: number) => {
    this.props.update<UMLPetriNetPlace>(id, { amountOfTokens: value });
  };

  private changeCapacity = (id: string) => (value: number) => {
    this.props.update<UMLPetriNetPlace>(id, { capacity: value });
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const UMLPetriNetPlaceUpdate = enhance(UmlPetriNetPlaceUpdateComponent);
