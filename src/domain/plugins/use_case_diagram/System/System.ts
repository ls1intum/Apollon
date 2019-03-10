import Container from '../../../Container';
import { EntityKind } from '../../../../services/Interface/ExternalState';

class System extends Container {
  kind = EntityKind.System;
}

export default System;
