import Editor from './Editor';
import Renderer from './rendering/Renderer';

export * from './Editor';
export default Editor;

export {
  RelationshipKind,
  EntityKind,
} from './services/Interface/ExternalState';

export { computeBoundingBox } from './domain/geo/boundingBox';

export const layoutDiagram = Editor.layoutDiagram;
export const renderDiagramToSVG = Editor.renderDiagramToSVG;
export const renderEntityToSVG = Editor.renderEntityToSVG;
export const renderRelationshipToSVG = Editor.renderRelationshipToSVG;
export const exportDiagram = Renderer.exportDiagram;

export const ENTITY_KIND_HEIGHT = 10;
export const ENTITY_MEMBER_HEIGHT = 30;
export const ENTITY_MEMBER_LIST_VERTICAL_PADDING = 0;
export const ENTITY_NAME_HEIGHT = 40;
