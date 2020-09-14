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
import { Direction } from '../../../services/uml-element/uml-element-port';
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
      messages: this.messages,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLCommunicationLink =>
      v.type === CommunicationRelationshipType.CommunicationLink;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.messages = values.messages.map((message) => new CommunicationLinkMessage(message));
  }

  //  TODO: add render method which layouts the messages

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
    let direction: Direction | undefined;
    let messagePosition: Point | undefined;

    // finds the connection between two points of path where half distance of total connection is reached
    // and determines the direction of the path there
    for (let index = 0; index < path.length - 1; index++) {
      // distance between two path points
      const vector = path[index + 1].subtract(path[index]);
      if (vector.length > distance) {
        const norm = vector.normalize();
        direction =
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

    if (!direction || !messagePosition) {
      throw Error(
        `Could not determine direction or messagePosition for CommunicationLink. \n MessagePosition: ${messagePosition} \n Direction: ${direction}`,
      );
    }

    // compute position of message
    const sourceElements = this.messages.filter((message) => message.direction === 'source').map(element => new CommunicationLinkMessage(element));
    const targetElements = this.messages.filter((message) => message.direction === 'target').map(element => new CommunicationLinkMessage(element));;

    const targetMessagesBoundingBox = this.computeBoundingBoxForMessages(
      canvas,
      messagePosition,
      targetElements,
      direction,
      'target',
    );
    const sourceMessagesBoundingBox = this.computeBoundingBoxForMessages(
      canvas,
      messagePosition,
      sourceElements,
      direction,
      'source',
    );

    // merge bounding box of path with bounding box of messages
    this.bounds = computeBoundingBoxForElements([
      this,
      { bounds: sourceMessagesBoundingBox },
      { bounds: targetMessagesBoundingBox },
    ]);

    this.path.forEach((point) => {
      point.x = point.x + pathBounds.x - this.bounds.x;
      point.y = point.y + pathBounds.y - this.bounds.y;
    });

    return [this, ...sourceElements, ...targetElements];
  }

  computeBoundingBoxForMessages(
    canvas: ILayer,
    messagePosition: Point,
    messages: ICommunicationLinkMessage[],
    arrowDirection: Direction,
    direction: 'source' | 'target',
  ): IBoundary {
    const arrowSize = Text.size(canvas, '⟶', { fontWeight: 'bold', fontSize: '120%' });

    let y = 0;

    for (const message of messages) {
      message.bounds.x = this.bounds.x + messagePosition.x;
      message.bounds.y = this.bounds.y + y;
      const messageSize = Text.size(canvas, 'test', { fontSize: '1.2em' });
      message.bounds.width = messageSize.width;
      message.bounds.height = messageSize.height;
      y += messageSize.height;
    }

    const messageBounds = computeBoundingBoxForElements(messages);
    // const heightInDirection =
    //   arrowDirection === Direction.Up || arrowDirection === Direction.Down
    //     ? height
    //     : direction === 'target'
    //     ? -1 * height
    //     : height;

    return messageBounds;
  }
}
