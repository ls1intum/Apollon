import { UMLModel } from '../typings';
import { isV2, v2ModeltoV3Model, UMLModelCompat as UMLModelCompatV2 } from './v2';

//
// when adding new versions with backward compatibility,
// this should be the union of all compat model types exported
// by the corresponding version module, i.e.:
//
// ```ts
// export type UMLModelCompat = UMLModelCompatV2 | UMLModelCompatV3;
// ```
//
export type UMLModelCompat = UMLModelCompatV2;

export function backwardsCompatibleModel(model: UMLModelCompat): UMLModel {
  if (isV2(model)) {
    return v2ModeltoV3Model(model);
  } else {
    return model;
  }
}
