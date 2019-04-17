import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Button } from '../../components/controls/button/button';
import { TrashIcon } from '../../components/controls/icon/trash';
import { Header } from '../../components/controls/typography/typography';
import { I18nContext } from '../../components/i18n/i18n-context';
import { localized } from '../../components/i18n/localized';
import { ModelState } from '../../components/store/model-state';
import { styled } from '../../components/theme/styles';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class DefaultRelationshipPopupComponent extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          <Flex>
            <Header>{this.props.translate('popup.relationship')}</Header>
            <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
        </section>
      </div>
    );
  }
}

type OwnProps = {
  element: Element;
};

type StateProps = {};

type DispatchProps = {
  delete: typeof ElementRepository.delete;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    null,
    {
      delete: ElementRepository.delete,
    },
  ),
);

export const DefaultRelationshipPopup = enhance(DefaultRelationshipPopupComponent);
