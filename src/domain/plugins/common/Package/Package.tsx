import Container from '../../../Container';
import { ElementType } from '..';

class Package extends Container {
  static features = {
    ...Container.features,
    connectable: false,
    editable: false,
  };

  type = ElementType.Package;
}

export default Package;
