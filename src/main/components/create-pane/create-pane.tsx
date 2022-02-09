import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type.js';
import { composeActivityPreview } from '../../packages/uml-activity-diagram/activity-preview.js';
import { composeClassPreview } from '../../packages/uml-class-diagram/class-preview';
import { composeCommunicationPreview } from '../../packages/uml-communication-diagram/communication-preview.js';
import { composeComponentPreview } from '../../packages/uml-component-diagram/component-preview.js';
import { composeDeploymentPreview } from '../../packages/uml-deployment-diagram/deployment-preview.js';
import { composeObjectPreview } from '../../packages/uml-object-diagram/object-preview.js';
import { composeUseCasePreview } from '../../packages/uml-use-case-diagram/use-case-preview.js';
import { UMLElement } from '../../services/uml-element/uml-element.js';
import { UMLElementFeatures } from '../../services/uml-element/uml-element-features.js';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository.js';
import { UMLElementState } from '../../services/uml-element/uml-element-types.js';
import { clone } from '../../utils/geometry/tree.js';
import { CanvasContext } from '../canvas/canvas-context.js';
import { withCanvas } from '../canvas/with-canvas.js';
import { I18nContext } from '../i18n/i18n-context.js';
import { localized } from '../i18n/localized.js';
import { ModelState } from '../store/model-state.js';
import { StoreProvider } from '../store/model-store.js';
import { PreviewElementComponent } from './preview-element-component.js';
import { composePetriNetPreview } from '../../packages/uml-petri-net/petri-net-preview.js';
import { composeReachabilityGraphPreview } from '../../packages/uml-reachability-graph/reachability-graph-preview.js';
import { PreviewElement } from '../../packages/compose-preview.js';
import { composeSyntaxTreePreview } from '../../packages/syntax-tree/syntax-tree-preview.js';
import { composeFlowchartPreview } from '../../packages/flowchart/flowchart-diagram-preview.js';
import { ColorLegend } from '../../packages/common/color-legend/color-legend.js';
import { Separator } from './create-pane-styles.js';
type OwnProps = {};

type StateProps = {
  type: UMLDiagramType;
  colorEnabled: boolean;
  scale: number;
};

type DispatchProps = {
  create: typeof UMLElementRepository.create;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext & CanvasContext;

const getInitialState = ({ type, canvas, translate, colorEnabled, scale }: Props) => {
  const previews: PreviewElement[] = [];
  const utils: PreviewElement[] = [];

  switch (type) {
    case UMLDiagramType.ClassDiagram:
      previews.push(...composeClassPreview(canvas, translate, scale));
      break;
    case UMLDiagramType.ObjectDiagram:
      previews.push(...composeObjectPreview(canvas, translate, scale));
      break;
    case UMLDiagramType.ActivityDiagram:
      previews.push(...composeActivityPreview(canvas, translate, scale));
      break;
    case UMLDiagramType.UseCaseDiagram:
      previews.push(...composeUseCasePreview(canvas, translate, scale));
      break;
    case UMLDiagramType.CommunicationDiagram:
      previews.push(...composeCommunicationPreview(canvas, translate, scale));
      break;
    case UMLDiagramType.ComponentDiagram:
      previews.push(...composeComponentPreview(canvas, translate, scale));
      break;
    case UMLDiagramType.DeploymentDiagram:
      previews.push(...composeDeploymentPreview(canvas, translate, scale));
      break;
    case UMLDiagramType.PetriNet:
      previews.push(...composePetriNetPreview(canvas, translate, scale));
      break;
    case UMLDiagramType.ReachabilityGraph:
      previews.push(...composeReachabilityGraphPreview(canvas, translate, scale));
      break;
    case UMLDiagramType.SyntaxTree:
      previews.push(...composeSyntaxTreePreview(canvas, translate, scale));
      break;
    case UMLDiagramType.Flowchart:
      previews.push(...composeFlowchartPreview(canvas, translate, scale));
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
      scale: state.editor.scale,
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
          <div style={previewStyles} key={index}>
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
      <StoreProvider initialState={{ elements, editor: { features, scale: this.props.scale } }}>
        {this.getElementArray(previews)}
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
