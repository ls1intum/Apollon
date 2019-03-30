import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Section } from '../../components/popup/controls/section';
import { TextField } from '../../components/popup/controls/textfield';
import { ModelState } from '../../components/store/model-state';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';

class DefaultPopupComponent extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <div>
        <Section>
          <TextField value={element.name} onUpdate={this.onUpdate} />
        </Section>
      </div>
    );
  }
  private onUpdate = (value: string) => {
    const { element, rename } = this.props;
    rename(element.id, value);
  };
}

type OwnProps = {
  element: Element;
};

type StateProps = {};

type DispatchProps = {
  rename: typeof ElementRepository.rename;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  null,
  {
    rename: ElementRepository.rename,
  },
);

export const DefaultPopup = enhance(DefaultPopupComponent);
