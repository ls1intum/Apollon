import { UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { PrototypeLabel } from '../prototype-label/prototype-label';
import { Text } from '../../../utils/svg/text';
import { UMLElement } from '../../../services/uml-element/uml-element';

export abstract class ScfContainer extends UMLContainer {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    updatable: true,
    resizable: false,
    droppable: false,
  };

  private static readonly MIN_WIDTH = 120
  private static readonly MIN_HEIGHT = 50

  render(canvas: ILayer, children?: ILayoutable[] | undefined): ILayoutable[] {
    this.autoWidth(canvas, children);

    let yOffset = 30;
    for (const child of children ?? []) {
      if (child instanceof PrototypeLabel) {
        child.bounds.x = 0;
        child.bounds.y = yOffset;
        yOffset += child.bounds.height;
      }
    }
    this.bounds.height = Math.max(yOffset, ScfContainer.MIN_HEIGHT);

    return [this, ...(children ?? [])];
  }

  /**
   * Auto-width the rectangle based on the name and labels
   * @param canvas The canvas layer
   * @param children The children elements (labels)
   */
  autoWidth(canvas: ILayer, children?: ILayoutable[] | undefined): void {
    const nameWidth = Text.size(canvas, this.name, { fontWeight: 'bold' }).width + 20;

    const presentChildren = children ?? [];

    const maxLabelWidth = presentChildren.reduce((max, child) => {
      if (child instanceof PrototypeLabel) {
        const labelWidth = Text.size(canvas, (child as UMLElement).name, { fontWeight: 'normal' }).width + 20;
        return Math.max(max, labelWidth);
      }
      return max;
    }, 0);

    const newWidth = Math.max(ScfContainer.MIN_WIDTH, nameWidth, maxLabelWidth);
    const newWidthRounded = Math.ceil(newWidth / 10) * 10;
    [...presentChildren, this].forEach((element) => {
      element.bounds.width = newWidthRounded;
    });
  }
}
