import { Container } from '../../../../services/container';
import { ElementType } from '..';

class UseCaseSystem extends Container {
  static features = { ...Container.features, connectable: false };
  type = ElementType.UseCaseSystem;
}

export default UseCaseSystem;
