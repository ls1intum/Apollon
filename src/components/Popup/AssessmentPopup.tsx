import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Element from '../../domain/Element';

class AssessmentPopup extends Component {
  render() {
    return <div>Assessment</div>;
  }
}

interface OwnProps {
  element: Element;
}

interface StateProps {
  readonly: boolean;
}

interface DispatchProps {}

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  state => ({ readonly: state.editor.readonly }),
  {}
)(AssessmentPopup);
