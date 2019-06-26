import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { composeActivityPreview } from '../../packages/activity-diagram/activity-preview';
import { composeClassPreview } from '../../packages/class-diagram/class-preview';
import { composeCommunicationPreview } from '../../packages/communication-diagram/communication-preview';
import { composeComponentPreview } from '../../packages/component-diagram/component-preview';
import { composeDeploymentPreview } from '../../packages/deployment-diagram/deployment-preview';
import { UMLDiagramType } from '../../packages/diagram-type';
import { composeObjectPreview } from '../../packages/object-diagram/object-preview';
import { composeUseCasePreview } from '../../packages/use-case-diagram/use-case-preview';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../services/uml-element/uml-element-features';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { clone } from '../../utils/geometry/tree';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { StoreProvider } from '../store/model-store';
import { PreviewElement } from './preview-element';

type OwnProps = {};

type StateProps = {
  type: UMLDiagramType;
};

type DispatchProps = {
  create: typeof UMLElementRepository.create;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext & CanvasContext;

const getInitialState = ({ type, canvas, translate }: Props) => {
  const previews: UMLElement[] = [];
  switch (type) {
    case UMLDiagramType.ClassDiagram:
      previews.push(...composeClassPreview(canvas, translate));
      break;
    case UMLDiagramType.ObjectDiagram:
      previews.push(...composeObjectPreview(canvas, translate));
      break;
    case UMLDiagramType.ActivityDiagram:
      previews.push(...composeActivityPreview(canvas, translate));
      break;
    case UMLDiagramType.UseCaseDiagram:
      previews.push(...composeUseCasePreview(canvas, translate));
      break;
    case UMLDiagramType.CommunicationDiagram:
      previews.push(...composeCommunicationPreview(canvas, translate));
      break;
    case UMLDiagramType.ComponentDiagram:
      previews.push(...composeComponentPreview(canvas, translate));
      break;
    case UMLDiagramType.DeploymentDiagram:
      previews.push(...composeDeploymentPreview(canvas, translate));
      break;
  }

  return { previews };
};

type State = ReturnType<typeof getInitialState>;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  withCanvas,
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
        [preview.id]: { ...preview },
      }),
      {},
    );

    return (
      <StoreProvider initialState={{ elements, editor: { features } }}>
        {Object.values(previews)
          .filter(preview => !preview.owner)
          .map((preview, index) => (
            <PreviewElement key={index} element={preview} create={this.create} />
          ))}
      </StoreProvider>
    );
  }

  create = (preview: UMLElement, owner?: string) => {
    const elements = clone(preview, this.state.previews);
    this.props.create(elements, owner);
  };
}

export const CreatePane = enhance(CreatePaneComponent);
