import { UUID } from './../../core/utils';

interface Element {
  id: UUID;
}

export default Element;
export { ElementState } from './types';
export { default as ElementRepository, Actions } from './repository';
export { default as ElementReducer } from './reducer';
