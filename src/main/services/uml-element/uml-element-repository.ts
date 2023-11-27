import { Connectable } from './connectable/connectable-repository';
import { Hoverable } from './hoverable/hoverable-repository';
import { Interactable } from './interactable/interactable-repository';
import { Movable } from './movable/movable-repository';
import { Resizable } from './resizable/resizable-repository';
import { Selectable } from './selectable/selectable-repository';
import { RemoteSelectable } from './remote-selectable/remote-selection-repository';
import { UMLElementCommonRepository } from './uml-element-common-repository';
import { Updatable } from './updatable/updatable-repository';

export const UMLElementRepository = {
  ...UMLElementCommonRepository,
  ...Hoverable,
  ...Selectable,
  ...RemoteSelectable,
  ...Movable,
  ...Resizable,
  ...Connectable,
  ...Interactable,
  ...Updatable,
};
