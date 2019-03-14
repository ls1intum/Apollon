import Container from '../../../Container';
import { ElementKind } from '..';

class UseCaseSystem extends Container {
  static features = { ...Container.features, connectable: false };
  kind = ElementKind.UseCaseSystem;
}

export default UseCaseSystem;
