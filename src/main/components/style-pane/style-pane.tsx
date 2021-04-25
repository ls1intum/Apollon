import React, { Component, ComponentClass } from 'react';
import { CirclePicker } from 'react-color';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';

type OwnProps = {};

type StateProps = {
  type: UMLDiagramType;
};

type DispatchProps = {
  create: typeof UMLElementRepository.create;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext & CanvasContext;

const getInitialState = () => ({});

type State = ReturnType<typeof getInitialState>;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      type: state.diagram.type,
      selected: state.selected,
    }),
    {
      create: UMLElementRepository.create,
    },
  ),
);

class StylePaneComponent extends Component<Props, State> {
  state = getInitialState();

  render() {
    return (
      <div>
        <div>
          <span>Fill</span>
        </div>
      </div>
    );
  }
}

export const StylePane = enhance(StylePaneComponent);
