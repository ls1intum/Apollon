import Apollon, { ApollonOptions } from '../src';
import { RenderOptions } from '../src/rendering/renderers/svg';
import { DiagramType } from '../src/domain/Diagram';
import { ApollonMode } from '../src/services/EditorService';

const container = document.getElementById('apollon')!;
let options: ApollonOptions = {
  initialState: JSON.parse(window.localStorage.getItem('apollon')!),
  diagramType: DiagramType.ClassDiagram,
  mode: ApollonMode.Full,
  theme: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, HelveticaNeue, Arial, sans-serif',
  },
};

let editor: Apollon | null = null;
const render = (container: HTMLElement, options: ApollonOptions) => {
  editor && editor.destroy();
  editor = new Apollon(container, options);
};
render(container, options);

export const onChange = (event: MouseEvent) => {
  const { name, value } = event.target as HTMLSelectElement;
  options = { ...options, [name]: value };
  render(container, options);
};

export const save = () => {
  if (!editor) return;

  const state = editor.getState();
  localStorage.setItem('apollon', JSON.stringify(state));
  options = { ...options, initialState: state || undefined };
};

export const clear = () => {
  localStorage.removeItem('apollon');
  options = { ...options, initialState: undefined };
};

export const draw = () => {
  if (!editor) return;

  const state = editor.getState();
  if (!state || !state.entities.allIds.length) return;

  const layoutedDiagram = Apollon.layoutDiagram(state, {
    outerPadding: 50,
  });

  const renderOptions: RenderOptions = {
    shouldRenderElement: (id: string) => true,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, HelveticaNeue, Arial, sans-serif',
  };

  const { svg } = Apollon.renderDiagramToSVG(layoutedDiagram, renderOptions);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
  const svgBlobURL = URL.createObjectURL(svgBlob);
  window.open(svgBlobURL);
};
