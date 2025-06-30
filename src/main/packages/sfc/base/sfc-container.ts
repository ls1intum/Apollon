import { UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { Text } from '../../../utils/svg/text';
import { UMLElement } from '../../../services/uml-element/uml-element';

/**
 * Base container class for sfc containers with automatic sizing.
 * Handles layout of child elements and adjusts width/height accordingly.
 */
export abstract class SfcContainer extends UMLContainer {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    updatable: true,
    resizable: false,
    droppable: false,
  };

  protected minWidth = 120;
  protected minHeight = 50;
  protected childWidthCalculation: (canvas: ILayer, child: UMLElement) => number = (canvas, child) =>
    Text.size(canvas, (child as UMLElement).name, { fontWeight: 'normal' }).width + 20;

  render(canvas: ILayer, children?: ILayoutable[] | undefined): ILayoutable[] {
    this.autoWidth(canvas, children);
    this.autoHeight(children);

    return [this, ...(children ?? [])];
  }

  private autoWidth(canvas: ILayer, children?: ILayoutable[]): void {
    const nameWidth = Text.size(canvas, this.name, { fontWeight: 'bold' }).width + 20;

    const presentChildren = children ?? [];

    const maxLabelWidth = presentChildren.reduce((max, child) => {
      const childWidth = this.childWidthCalculation(canvas, child as UMLElement);
      return Math.max(max, childWidth);
    }, 0);

    const newWidth = Math.max(this.minWidth, nameWidth, maxLabelWidth);
    const newWidthRounded = Math.ceil(newWidth / 10) * 10;
    [...presentChildren, this].forEach((element) => {
      element.bounds.width = newWidthRounded;
    });
  }

  private autoHeight(children?: ILayoutable[]): void {
    let yOffset = 0;
    for (const child of children ?? []) {
      child.bounds.x = 0;
      child.bounds.y = yOffset;
      yOffset += child.bounds.height;
    }
    this.bounds.height = Math.max(yOffset, this.minHeight);
  }
}
