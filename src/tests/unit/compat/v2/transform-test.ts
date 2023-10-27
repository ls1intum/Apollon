import { v2ModeltoV3Model } from '../../../../main/compat/v2/transform';

describe('test v2 to v3 model conversion', () => {
  it('handles corrupt models.', () => {
    expect(() => v2ModeltoV3Model({} as any)).not.toThrow();
    expect(() => v2ModeltoV3Model({ elements: {} } as any)).not.toThrow();
    expect(() => v2ModeltoV3Model({ elements: [], relationships: {} } as any)).not.toThrow();
    expect(() => v2ModeltoV3Model({ assessments: {} } as any)).not.toThrow();
  });
});
