import Container from '../../../Container';
import { ElementKind } from '..';

class Package extends Container {
  static features = {
    ...Container.features,
    connectable: false,
    editable: false,
  };

  type = ElementKind.Package;
}

export default Package;
