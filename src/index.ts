import ApollonEditor from "./gui";
import { getAllEntities, getAllRelationships, ReduxState } from "./gui/redux";
import * as DiagramLayouter from "./rendering/layouters/diagram";

export * from "./gui";
export default ApollonEditor;

export function layoutDiagram(state: ReduxState, layoutOptions: DiagramLayouter.LayoutOptions) {
    const entities = getAllEntities(state);
    const relationships = getAllRelationships(state);

    return DiagramLayouter.layoutDiagram({ entities, relationships }, layoutOptions);
}

export {
    renderDiagramToSVG,
    renderEntityToSVG,
    renderRelationshipToSVG
} from "./rendering/renderers/svg";
