import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Button } from '../../components/controls/button/button';
import { ColorButton } from '../../components/controls/color-button/color-button';
import { TrashIcon } from '../../components/controls/icon/trash';
import { Header } from '../../components/controls/typography/typography';
import { I18nContext } from '../../components/i18n/i18n-context';
import { localized } from '../../components/i18n/localized';
import { ModelState } from '../../components/store/model-state';
import { StylePane } from '../../components/style-pane/style-pane';
import { styled } from '../../components/theme/styles';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class DefaultRelationshipPopupComponent extends Component<Props, State> {
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
            <Header>{this.props.translate('popup.relationship')}</Header>
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
        </section>
        <StylePane open={this.state.colorOpen} element={element} onColorChange={this.props.update} lineColor />
      </div>
    );
  }
}

type OwnProps = {
  element: UMLElement;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
  }),
);

export const DefaultRelationshipPopup = enhance(DefaultRelationshipPopupComponent);
