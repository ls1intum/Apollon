import { ComposePreview } from '../compose-preview';
import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { SfcJump } from './sfc-jump/sfc-jump';
import { SfcStart } from './sfc-start/sfc-start';
import { SfcStep } from './sfc-step/sfc-step';
import { SfcActionTable } from './sfc-action-table/sfc-action-table';
import { SfcActionTableRow } from './sfc-action-table/sfc-action-table-row/sfc-action-table-row';
import { SfcTransitionBranch } from './sfc-transition-branch/sfc-transition-branch';

export const composeSfcPreview: ComposePreview = (layer: ILayer, translate: (id: string) => string): UMLElement[] => {
  const sfcStart = new SfcStart({ name: translate('packages.Sfc.Start') });
  const sfcStep = new SfcStep({ name: translate('packages.Sfc.Step') });

  const sfcActionTable = new SfcActionTable();

  const sfcActionTableRow = new SfcActionTableRow({
    name: JSON.stringify(['A', translate('packages.Sfc.Actions')]),
    owner: sfcActionTable.id,
  });
  sfcActionTable.ownedElements = [sfcActionTableRow.id];

  const sfcTransitionBranch = new SfcTransitionBranch({
    name: translate('packages.Sfc.TransitionBranch'),
    bounds: {
      x: -1_000_000_000_000,
    },
  });

  const sfcJump = new SfcJump({ name: translate('packages.Sfc.Jump') });

  return [
    ...(sfcStart.render(layer) as UMLElement[]),
    ...(sfcStep.render(layer) as UMLElement[]),
    ...(sfcActionTable.render(layer, [sfcActionTableRow]) as UMLElement[]),
    ...(sfcTransitionBranch.render(layer) as UMLElement[]),
    ...(sfcJump.render(layer) as UMLElement[]),
  ];
};
