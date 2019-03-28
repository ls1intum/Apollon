import { Container } from '../../../services/container/container';
import { CommonElementType } from '..';

export class Package extends Container {
  static features = {
    ...Container.features,
    connectable: false,
    editable: false,
  };

  type = CommonElementType.Package;
}
