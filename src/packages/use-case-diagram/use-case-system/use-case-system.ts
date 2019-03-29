import { UseCaseElementType } from '..';
import { Container } from '../../../services/container/container';

export class UseCaseSystem extends Container {
  static features = { ...Container.features, connectable: false };
  type = UseCaseElementType.UseCaseSystem;
}
