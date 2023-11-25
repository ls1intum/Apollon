import { UMLModel } from '../typings';
import { UMLModelCompat } from './typings';
import { isV2, v2ModeltoV3Model } from './v2';

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

export type { UMLModelCompat } from './typings';
export * from './helpers';
