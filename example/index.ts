import Apollon, { ApollonOptions } from './../src';
import { DiagramType } from '../src/domain/Diagram';
import { ApollonMode } from '../src/services/EditorService';

const container = document.getElementById('apollon')!;
const options: ApollonOptions = {
  initialState: JSON.parse(window.localStorage.getItem('apollon')!),
  diagramType: DiagramType.ClassDiagram,
  mode: ApollonMode.Full,
  theme: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, HelveticaNeue, Arial, sans-serif',
  },
};
const editor = new Apollon(container, options);

export const onChange = (event: MouseEvent) => {
  const { name, value } = event.target as HTMLSelectElement;
  console.log('change', name, value);
};
