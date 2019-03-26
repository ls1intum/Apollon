import Container from '../../../Container';
import { ElementType } from '..';

class UseCaseSystem extends Container {
  static features = { ...Container.features, connectable: false };
  type = ElementType.UseCaseSystem;
}

export default UseCaseSystem;
