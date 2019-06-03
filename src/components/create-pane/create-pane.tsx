import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { composeClassPreview } from '../../packages/class-diagram/class-preview';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UMLElementFeatures, UMLElementState } from '../../services/uml-element/uml-element-types';
import { DiagramType } from '../../typings';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { ModelStore } from '../store/model-store';
import { PreviewElement } from './preview-element';

type OwnProps = {};

type StateProps = {
  type: DiagramType;
};

type DispatchProps = {
  create: typeof UMLElementRepository.create;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const getInitialState = ({ type, translate }: Props) => {
  const previews: UMLElement[] = [];
  switch (type) {
    case UMLDiagramType.ClassDiagram: {
      previews.push(...composeClassPreview(translate));
    }
  }

  return { previews };
};

type State = ReturnType<typeof getInitialState>;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      type: state.diagram.type,
    }),
    {
      create: UMLElementRepository.create,
    },
  ),
);

class CreatePaneComponent extends Component<Props, State> {
  state = getInitialState(this.props);

  render() {
    const features: UMLElementFeatures = {
      hoverable: false,
      selectable: false,
      movable: false,
      resizable: false,
      connectable: false,
      updatable: false,
      droppable: false,
    };

    const { previews } = this.state;
    const elements = previews.reduce<UMLElementState>(
      (state, preview) => ({
        ...state,
        [preview.id]: preview,
      }),
      {},
    );

    return (
      <ModelStore initialState={{ elements, features }}>
        {Object.values(previews)
          .filter(preview => !preview.owner)
          .map((preview, index) => (
            <PreviewElement key={index} element={preview} create={this.create} />
          ))}
      </ModelStore>
    );
  }

  create = (preview: UMLElement, owner?: string) => {
    const elements = UMLElementRepository.clone(preview, this.state.previews);
    this.props.create(elements, owner);
  };
}

export const CreatePane = enhance(CreatePaneComponent);
