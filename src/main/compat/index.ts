import { UMLModel } from '../typings';
import { isV2, v2ModeltoV3Model, UMLModelCompat as UMLModelCompatV2 } from './v2';

/**
 *
 * Represents all model versions that can be converted to the latest version.
 *
 */
/*
 *
 * HINT for future maintainers:
 *
 * this should always be the union of compatible model versions, i.e.
 * if the model version is moved to V4, while support for V2 is still required,
 * this should look like the following:
 *
 * ```ts
 * export type UMLModelCompat = UMLModelCompatV2 | UMLModelCompatV3;
 * ```
 */
export type UMLModelCompat = UMLModelCompatV2;

/**
 *
 * Converts a model to the latest version.
 *
 * @param {UMLModelCompat} model model to convert
 * @returns {UMLModel} the converted model
 *
 */
export function backwardsCompatibleModel(model: UMLModelCompat): UMLModel {
  if (isV2(model)) {
    return v2ModeltoV3Model(model);
  } else {
    return model;
  }
}
