import { DeepPartial } from 'redux';
import { CommunicationRelationshipType } from '..';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import * as Apollon from '../../../typings';
import { assign } from '../../../utils/fx/assign';
import { CommunicationLinkMessage, ICommunicationLinkMessage } from './uml-communiction-link-message';
import { computeBoundingBoxForElements, IBoundary } from '../../../utils/geometry/boundary';
import { ILayer } from '../../../services/layouter/layer';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { Point } from '../../../utils/geometry/point';
import { Direction, getOppositeDirection } from '../../../services/uml-element/uml-element-port';
import { Text } from '../../../utils/svg/text';

export interface IUMLCommunicationLink extends IUMLRelationship {
  messages: ICommunicationLinkMessage[];
}

export class UMLCommunicationLink extends UMLRelationship implements IUMLCommunicationLink {
  type = CommunicationRelationshipType.CommunicationLink;
  messages: ICommunicationLinkMessage[] = [];

  constructor(values?: DeepPartial<IUMLCommunicationLink>) {
    super();
    assign<IUMLCommunicationLink>(this, values);
  }

  serialize(): Apollon.UMLCommunicationLink {
    return {
      ...super.serialize(),
      messages: this.messages.reduce((acc, message) => ({ ...acc, [message.id]: message }), {}),
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLCommunicationLink =>
      v.type === CommunicationRelationshipType.CommunicationLink;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.messages = Object.values(values.messages).map((message) => new CommunicationLinkMessage(message));
  }

  render(canvas: ILayer, source?: UMLElement, target?: UMLElement): ILayoutable[] {
    // computes bounds for path only
    super.render(canvas, source, target);
    // only bounds for path - used for calculate the translation
    const pathBounds = this.bounds;

    // compute point of messages
    // maps element.path to Point to get methods
    // element.path contains start and end point + direction change points
    const path = this.path.map((point) => new Point(point.x, point.y));
    // half distance of total connection
    let distance =
      path.reduce(
        (length, point, i, points) => (i + 1 < points.length ? length + points[i + 1].subtract(point).length : length),
        0,
      ) / 2;

    // direction in which the arrow is pointing
    let sourceArrowDirection: Direction | undefined;
    let messagePosition: Point | undefined;

    // finds the connection between two points of path where half distance of total connection is reached
    // and determines the direction of the path there
    for (let index = 0; index < path.length - 1; index++) {
      // distance between two path points
      const vector = path[index + 1].subtract(path[index]);
      if (vector.length > distance) {
        const norm = vector.normalize();
        sourceArrowDirection =
          Math.abs(norm.x) > Math.abs(norm.y)
            ? norm.x > 0
              ? Direction.Left
              : Direction.Right
            : norm.y > 0
              ? Direction.Up
              : Direction.Down;
        messagePosition = path[index].add(norm.scale(distance));
        break;
      }
      distance -= vector.length;
    }

    if (!sourceArrowDirection || !messagePosition) {
      throw Error(
        `Could not determine direction or messagePosition for CommunicationLink. \n MessagePosition: ${messagePosition} \n Direction: ${sourceArrowDirection}`,
      );
    }

    // add this to make the messagePosition absolute and not relative to path origin
    messagePosition = messagePosition.add(pathBounds.x, pathBounds.y);

    // compute position of message
    const sourceElements = this.messages.filter((message) => message.direction === 'source');
    const targetElements = this.messages.filter((message) => message.direction === 'target');

    const elementsForBoundingBoxCalculation: { bounds: IBoundary }[] = [{ bounds: pathBounds }];

    if (sourceElements && sourceElements.length > 0) {
      const sourceMessagesBoundingBox = this.computeBoundingBoxForMessages(
        canvas,
        messagePosition,
        sourceElements,
        sourceArrowDirection,
      );
      elementsForBoundingBoxCalculation.push({ bounds: sourceMessagesBoundingBox });
    }

    // arrow of targets are in the opposite direction
    const targetArrowDirection = getOppositeDirection(sourceArrowDirection);

    if (targetElements && targetElements.length > 0) {
      const targetMessagesBoundingBox = this.computeBoundingBoxForMessages(
        canvas,
        messagePosition,
        targetElements,
        targetArrowDirection,
      );
      elementsForBoundingBoxCalculation.push({ bounds: targetMessagesBoundingBox });
    }

    // merge bounding box of path with bounding box of messages
    this.bounds = computeBoundingBoxForElements(elementsForBoundingBoxCalculation);

    const horizontalTranslation = pathBounds.x - this.bounds.x;
    const verticalTranslation = pathBounds.y - this.bounds.y;

    // translation of path points, because they are relative to their own bounding box
    // the bounding may be different now -> translation to correct this
    this.path.forEach((point) => {
      point.x += horizontalTranslation;
      point.y += verticalTranslation;
    });

    // depiction in UMLCommunicationLinkComponent is relative to path origin -> subtract pathBounds to make it relative again
    this.messages.forEach((message) => {
      message.bounds.x += horizontalTranslation - pathBounds.x;
      message.bounds.y += verticalTranslation - pathBounds.y;
    });

    return [this];
  }

  computeBoundingBoxForMessages(
    canvas: ILayer,
    messagePosition: Point,
    messages: ICommunicationLinkMessage[],
    arrowDirection: Direction,
  ): IBoundary {
    const arrowSize = Text.size(canvas, '⟶', { fontWeight: 'bold', fontSize: '120%' });

    let y =
      arrowDirection === Direction.Left
        ? messagePosition.y - arrowSize.height
        : arrowDirection === Direction.Right
          ? messagePosition.y + Text.size(canvas, messages[0].name).height + arrowSize.height
          : messagePosition.y;

    const x =
      arrowDirection === Direction.Up
        ? messagePosition.x + arrowSize.width
        : arrowDirection === Direction.Down
          ? messagePosition.x - arrowSize.width
          : messagePosition.x;

    for (const message of messages) {
      const messageSize = Text.size(canvas, message.name);

      if (arrowDirection === Direction.Right) {
        // ⟵ messages with this displayed arrow
        // center message
        message.bounds.x = x - messageSize.width / 2;
        message.bounds.y = y;
        message.bounds.width = messageSize.width;
        message.bounds.height = messageSize.height;
        y += messageSize.height;
      } else if (arrowDirection === Direction.Down) {
        // ↑ messages with this displayed arrow
        // drawing from left to right
        message.bounds.x = x - messageSize.width;
        message.bounds.y = y;
        message.bounds.width = messageSize.width;
        message.bounds.height = messageSize.height;
        y += messageSize.height;
      } else if (arrowDirection === Direction.Up) {
        // ↓ messages with this displayed arrow
        message.bounds.x = x;
        message.bounds.y = y;
        message.bounds.width = messageSize.width;
        message.bounds.height = messageSize.height;
        y += messageSize.height;
      } else if (arrowDirection === Direction.Left) {
        // ⟶ messages with this displayed arrow
        // center message
        message.bounds.x = x - messageSize.width / 2;
        message.bounds.y = y;
        message.bounds.width = messageSize.width;
        message.bounds.height = messageSize.height;
        // drawing from top to bottom
        y -= messageSize.height;
      }
    }

    return computeBoundingBoxForElements(messages);
  }
}
