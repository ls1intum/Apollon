import { Connectable } from './connectable/connectable-repository.js';
import { Hoverable } from './hoverable/hoverable-repository.js';
import { Interactable } from './interactable/interactable-repository.js';
import { Movable } from './movable/movable-repository.js';
import { Resizable } from './resizable/resizable-repository.js';
import { Selectable } from './selectable/selectable-repository.js';
import { UMLElementCommonRepository } from './uml-element-common-repository.js';
import { Updatable } from './updatable/updatable-repository.js';

export const UMLElementRepository = {
  ...UMLElementCommonRepository,
  ...Hoverable,
  ...Selectable,
  ...Movable,
  ...Resizable,
  ...Connectable,
  ...Interactable,
  ...Updatable,
};
