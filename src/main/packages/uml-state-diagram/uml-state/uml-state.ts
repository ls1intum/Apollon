import { DeepPartial } from 'redux';
import { StateElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import * as Apollon from '../../../typings';
import { assign } from '../../../utils/fx/assign';
import { Text } from '../../../utils/svg/text';
import { UMLElementType } from '../../uml-element-type';
import { UMLStateBody } from '../uml-state-body/uml-state-body';
import { UMLStateFallbackBody } from '../uml-state-fallback_body/uml-state-fallback_body';

export interface IUMLState extends IUMLContainer {
  italic: boolean;
  underline: boolean;
  stereotype: string | null;
  deviderPosition: number;
  hasBody: boolean;
  hasFallbackBody: boolean;
}

export class UMLState extends UMLContainer implements IUMLState {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    droppable: false,
    resizable: 'WIDTH',
  };
  static stereotypeHeaderHeight = 50;
  static nonStereotypeHeaderHeight = 40;

  type: UMLElementType = StateElementType.State;
  italic: boolean = false;
  underline: boolean = false;
  stereotype: string | null = null;
  deviderPosition: number = 0;
  hasBody: boolean = false;
  hasFallbackBody: boolean = false;

  get headerHeight() {
    return this.stereotype ? UMLState.stereotypeHeaderHeight : UMLState.nonStereotypeHeaderHeight;
  }

  constructor(values?: DeepPartial<IUMLState>) {
    super();
    assign<IUMLState>(this, values);
  }

  reorderChildren(children: IUMLElement[]): string[] {
    const bodies = children.filter((x): x is UMLStateBody => x.type === StateElementType.StateBody);
    const fallbackBodies = children.filter((x): x is UMLStateFallbackBody => x.type === StateElementType.StateFallbackBody);
    return [...bodies.map((element) => element.id), ...fallbackBodies.map((element) => element.id)];
  }

  serialize(children: UMLElement[] = []): Apollon.UMLState {
    return {
      ...super.serialize(children),
      type: this.type as UMLElementType,
      bodies: children.filter((x) => x instanceof UMLStateBody).map((x) => x.id),
      fallbackBodies: children.filter((x) => x instanceof UMLStateFallbackBody).map((x) => x.id),
    };
  }

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    const bodies = children.filter((x): x is UMLStateBody => x instanceof UMLStateBody);
    const fallbackBodies = children.filter((x): x is UMLStateFallbackBody => x instanceof UMLStateFallbackBody);

    this.hasBody = bodies.length > 0;
    this.hasFallbackBody = fallbackBodies.length > 0;

    const radix = 10;
    this.bounds.width = [this, ...bodies, ...fallbackBodies].reduce(
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
    for (const body of bodies) {
      body.bounds.x = 0.5;
      body.bounds.y = y + 0.5;
      body.bounds.width = this.bounds.width - 1;
      y += body.bounds.height;
    }
    this.deviderPosition = y;
    for (const fallbackBody of fallbackBodies) {
      fallbackBody.bounds.x = 0.5;
      fallbackBody.bounds.y = y + 0.5;
      fallbackBody.bounds.width = this.bounds.width - 1;
      y += fallbackBody.bounds.height;
    }

    this.bounds.height = y;
    return [this, ...bodies, ...fallbackBodies];
  }
}
