import { DeepPartial } from 'redux';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import * as Apollon from '../../../typings';
import { assign } from '../../../utils/fx/assign';
import { Text } from '../../../utils/svg/text';
import { UMLElementType } from '../../uml-element-type';
import { UMLStateVariable } from './uml-state-variable';
import { UMLStateAction } from './uml-state-action';

export interface IUMLState extends IUMLContainer {
  italic: boolean;
  underline: boolean;
  stereotype: string | null;
  deviderPosition: number;
  hasVariables: boolean;
  hasActions: boolean;
}

export abstract class UMLState extends UMLContainer implements IUMLState {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    droppable: false,
    resizable: 'WIDTH',
  };
  static stereotypeHeaderHeight = 50;
  static nonStereotypeHeaderHeight = 40;

  italic: boolean = false;
  underline: boolean = false;
  stereotype: string | null = null;
  deviderPosition: number = 0;
  hasVariables: boolean = false;
  hasActions: boolean = false;

  get headerHeight() {
    return this.stereotype ? UMLState.stereotypeHeaderHeight : UMLState.nonStereotypeHeaderHeight;
  }

  constructor(values?: DeepPartial<IUMLState>) {
    super();
    assign<IUMLState>(this, values);
  }

  abstract reorderChildren(children: IUMLElement[]): string[];

  serialize(children: UMLElement[] = []): Apollon.UMLState {
    return {
      ...super.serialize(children),
      type: this.type as UMLElementType,
      variables: children.filter((x) => x instanceof UMLStateVariable).map((x) => x.id),
      actions: children.filter((x) => x instanceof UMLStateAction).map((x) => x.id),
    };
  }

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    const variables = children.filter((x): x is UMLStateVariable => x instanceof UMLStateVariable);
    const actions = children.filter((x): x is UMLStateAction => x instanceof UMLStateAction);

    this.hasVariables = variables.length > 0;
    this.hasActions = actions.length > 0;

    const radix = 10;
    this.bounds.width = [this, ...variables, ...actions].reduce(
      (current, child, index) =>
        Math.max(
          current,
          Math.round(
            (Text.size(layer, child.name, index === 0 ? { fontWeight: 'bold' } : undefined).width + 20) / radix,
          ) * radix,
        ),
      Math.round(this.bounds.width / radix) * radix,
    );

    let y = this.headerHeight;
    for (const variable of variables) {
      variable.bounds.x = 0.5;
      variable.bounds.y = y + 0.5;
      variable.bounds.width = this.bounds.width - 1;
      y += variable.bounds.height;
    }
    this.deviderPosition = y;
    for (const action of actions) {
      action.bounds.x = 0.5;
      action.bounds.y = y + 0.5;
      action.bounds.width = this.bounds.width - 1;
      y += action.bounds.height;
    }

    this.bounds.height = y;
    return [this, ...variables, ...actions];
  }
} 