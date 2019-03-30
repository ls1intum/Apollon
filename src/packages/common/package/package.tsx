import { CommonElementType } from '..';
import { Container } from '../../../services/container/container';

export class Package extends Container {
  static features = {
    ...Container.features,
    connectable: false,
    editable: false,
  };

  type = CommonElementType.Package;
}
