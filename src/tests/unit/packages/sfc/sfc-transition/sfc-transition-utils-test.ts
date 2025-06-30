import { getParsedName } from '../../../../../main/packages/sfc/sfc-transition/sfc-transition-utils';

describe('SfcTransitionUtils', () => {
  describe('getParsedName', () => {
    it('should return default values when name is undefined', () => {
      const result = getParsedName(undefined);
      expect(result).toEqual({ isNegated: false, displayName: '' });
    });

    it('should return default values when name is an empty string', () => {
      const result = getParsedName('');
      expect(result).toEqual({ isNegated: false, displayName: '' });
    });

    it('should parse valid JSON string correctly', () => {
      const validJson = JSON.stringify({ isNegated: true, displayName: 'Test Name' });
      const result = getParsedName(validJson);
      expect(result).toEqual({ isNegated: true, displayName: 'Test Name' });
    });

    it('should throw an error when invalid JSON is provided', () => {
      const invalidJson = '{isNegated: true, displayName: "Test Name"}'; // Missing quotes around property names
      expect(() => getParsedName(invalidJson)).toThrow();
    });
  });
});
