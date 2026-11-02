import vectors from './fixtures/validator-vectors.json';
import {
  gstinMatchesStateCode,
  isValidAadhaar,
  isValidGstin,
  isValidMobile,
  isValidPan,
  isValidPincode,
  normalizeMobile,
  panFromGstin,
} from '../src/lib/validators';

// The same examples as trifidserverapp/tests/validators.test.ts (see the
// fixture's _comment), so this copy cannot drift from the server's rules.
describe('validators match the server', () => {
  it('mobile', () => {
    for (const [raw, normalised] of vectors.mobile.valid) {
      expect(normalizeMobile(raw)).toBe(normalised);
      expect(isValidMobile(raw)).toBe(true);
    }
    for (const raw of vectors.mobile.invalid) expect(isValidMobile(raw)).toBe(false);
  });

  it('GSTIN, its state code and the PAN inside it', () => {
    for (const gstin of vectors.gstin.valid) expect(isValidGstin(gstin)).toBe(true);
    for (const gstin of vectors.gstin.invalid) expect(isValidGstin(gstin)).toBe(false);
    for (const [gstin, code] of vectors.gstinStateCode.match) {
      expect(gstinMatchesStateCode(gstin, code)).toBe(true);
    }
    for (const [gstin, code] of vectors.gstinStateCode.mismatch) {
      expect(gstinMatchesStateCode(gstin, code)).toBe(false);
    }
    for (const [gstin, pan] of vectors.panFromGstin) expect(panFromGstin(gstin)).toBe(pan);
  });

  it('PAN', () => {
    for (const pan of vectors.pan.valid) expect(isValidPan(pan)).toBe(true);
    for (const pan of vectors.pan.invalid) expect(isValidPan(pan)).toBe(false);
    for (const pan of vectors.employeePan.valid) {
      expect(isValidPan(pan, { personOnly: true })).toBe(true);
    }
    for (const pan of vectors.employeePan.invalid) {
      expect(isValidPan(pan, { personOnly: true })).toBe(false);
    }
  });

  it('Aadhaar and pincode', () => {
    for (const aadhaar of vectors.aadhaar.valid) expect(isValidAadhaar(aadhaar)).toBe(true);
    for (const aadhaar of vectors.aadhaar.invalid) expect(isValidAadhaar(aadhaar)).toBe(false);
    for (const pincode of vectors.pincode.valid) expect(isValidPincode(pincode)).toBe(true);
    for (const pincode of vectors.pincode.invalid) expect(isValidPincode(pincode)).toBe(false);
  });
});
