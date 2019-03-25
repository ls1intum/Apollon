import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import { Element, ElementRepository } from './../../domain/Element';
import { TextField, Section } from './Controls';

class DefaultPopup extends Component<Props> {
  private onUpdate = (value: string) => {
    const { element, rename } = this.props;
    rename(element.id, value);
  };

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
}

interface OwnProps {
  element: Element;
}

interface StateProps {}

interface DispatchProps {
  rename: typeof ElementRepository.rename;
}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, ModelState>(
  null,
  {
    rename: ElementRepository.rename,
  }
)(DefaultPopup);
