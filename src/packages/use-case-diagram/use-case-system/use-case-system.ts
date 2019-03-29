import { Container } from '../../../services/container/container';
import { UseCaseElementType } from '..';

export class UseCaseSystem extends Container {
  static features = { ...Container.features, connectable: false };
  type = UseCaseElementType.UseCaseSystem;
}
