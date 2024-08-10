import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { composeActivityPreview } from '../../packages/uml-activity-diagram/activity-preview';
import { composeClassPreview } from '../../packages/uml-class-diagram/class-preview';
import { composeCommunicationPreview } from '../../packages/uml-communication-diagram/communication-preview';
import { composeComponentPreview } from '../../packages/uml-component-diagram/component-preview';
import { composeDeploymentPreview } from '../../packages/uml-deployment-diagram/deployment-preview';
import { composeObjectPreview } from '../../packages/uml-object-diagram/object-preview';
import { composeUseCasePreview } from '../../packages/uml-use-case-diagram/use-case-preview';
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
import { PreviewElementComponent } from './preview-element-component';
import { composePetriNetPreview } from '../../packages/uml-petri-net/petri-net-preview';
import { composeReachabilityGraphPreview } from '../../packages/uml-reachability-graph/reachability-graph-preview';
import { PreviewElement } from '../../packages/compose-preview';
import { composeSyntaxTreePreview } from '../../packages/syntax-tree/syntax-tree-preview';
import { composeFlowchartPreview } from '../../packages/flowchart/flowchart-diagram-preview';
import { ColorLegend } from '../../packages/common/color-legend/color-legend';
import { Separator } from './create-pane-styles';
import { composeBPMNPreview } from '../../packages/bpmn/bpmn-diagram-preview';

type OwnProps = {};

type StateProps = {
  type: UMLDiagramType;
  colorEnabled: boolean;
  previewScaleFactor?: number;
};

type DispatchProps = {
  create: typeof UMLElementRepository.create;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext & CanvasContext;

const getInitialState = ({ type, canvas, translate, colorEnabled }: Props) => {
  const previews: PreviewElement[] = [];
  const utils: PreviewElement[] = [];

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
    case UMLDiagramType.PetriNet:
      previews.push(...composePetriNetPreview(canvas, translate));
      break;
    case UMLDiagramType.ReachabilityGraph:
      previews.push(...composeReachabilityGraphPreview(canvas, translate));
      break;
    case UMLDiagramType.SyntaxTree:
      previews.push(...composeSyntaxTreePreview(canvas, translate));
      break;
    case UMLDiagramType.Flowchart:
      previews.push(...composeFlowchartPreview(canvas, translate));
      break;
    case UMLDiagramType.BPMN:
      previews.push(...composeBPMNPreview(canvas, translate));
      break;
  }
  if (colorEnabled) {
    utils.push(
      new ColorLegend({
        name: translate('packages.ColorLegend.ColorLegend'),
      }),
    );
  }

  return { previews, utils };
};

type State = ReturnType<typeof getInitialState>;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      type: state.diagram.type,
      colorEnabled: state.editor.colorEnabled,
    }),
    {
      create: UMLElementRepository.create,
    },
  ),
);

class CreatePaneComponent extends Component<Props, State> {
  state = getInitialState(this.props);

  getElementArray = (previews: PreviewElement[]) => {
    return Object.values(previews)
      .filter((preview) => !preview.owner)
      .map((preview, index) => {
        const { styles: previewStyles } = preview;
        return (
          <div
            style={{ ...previewStyles, height: preview.bounds.height * (this.props?.previewScaleFactor ?? 0.8) + 8 }}
            key={index}
          >
            <PreviewElementComponent element={preview} create={this.create} />
          </div>
        );
      });
  };

  render() {
    const features: UMLElementFeatures = {
      hoverable: false,
      selectable: false,
      movable: false,
      resizable: false,
      connectable: false,
      updatable: false,
      droppable: false,
      alternativePortVisualization: false,
    };

    const { previews, utils } = this.state;

    const elements = [...previews, ...utils].reduce<UMLElementState>(
      (state, preview) => ({
        ...state,
        [preview.id]: { ...preview },
      }),
      {},
    );

    return (
      <StoreProvider initialState={{ elements, editor: { features } }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {this.getElementArray(previews)}
        </div>

        {utils && utils.length > 0 ? (
          <>
            <Separator />
            {this.getElementArray(utils)}
          </>
        ) : null}
      </StoreProvider>
    );
  }

  create = (preview: UMLElement, owner?: string) => {
    const elements = clone(preview, this.state.previews);
    this.props.create(elements, owner);
  };
}

export const CreatePane = enhance(CreatePaneComponent);
