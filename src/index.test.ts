import RSA from '.';

describe('RSA encryption / decryption', () => {
  it('Decrypted value should be same with original value. (unsigned)', () => {
    const originalValue = 'Some Plain Text';

    const bits = 512;
    const rsaKey = RSA.generateRSAKey(bits);
    const publicKeyString = RSA.publicKeyString(rsaKey);

    const encryptionResult = RSA.encrypt(originalValue, publicKeyString);
    const decryptionResult = RSA.decrypt(encryptionResult, rsaKey);

    expect(decryptionResult.plainText).toBe(originalValue);
  });

  it('When decrypt no-signature encryption value, the signature is `unsigned`.', () => {
    const originalValue = 'Some Plain Text';

    const bits = 512;
    const rsaKey = RSA.generateRSAKey(bits);
    const publicKeyString = RSA.publicKeyString(rsaKey);

    const encryptionResult = RSA.encrypt(originalValue, publicKeyString);
    const decryptionResult = RSA.decrypt(encryptionResult, rsaKey);

    expect(decryptionResult.signature).toBe('unsigned');
  });

  it('Decrypted value should be same with original value. (verified)', () => {
    const originalValue = 'Some Plain Text';

    const bits = 512;
    const rsaKey = RSA.generateRSAKey(bits);
    const publicKeyString = RSA.publicKeyString(rsaKey);

    const signature = RSA.generateRSAKey(bits);

    const encryptionResult = RSA.encrypt(originalValue, publicKeyString, signature);
    const decryptionResult = RSA.decrypt(encryptionResult, rsaKey);

    expect(decryptionResult.plainText).toBe(originalValue);
  });

  it('When decrypt signatured encryption value, the signature is `verified`. and result contains publicKey.', () => {
    const originalValue = 'Some Plain Text';

    const bits = 512;
    const rsaKey = RSA.generateRSAKey(bits);
    const publicKeyString = RSA.publicKeyString(rsaKey);

    const signature = RSA.generateRSAKey(bits);

    const encryptionResult = RSA.encrypt(originalValue, publicKeyString, signature);
    const decryptionResult = RSA.decrypt(encryptionResult, rsaKey);
    const publicKeyId = RSA.publicKeyId(RSA.publicKeyString(signature));

    expect(decryptionResult.signature).toBe('verified');
    expect(RSA.publicKeyId(decryptionResult.publicKey)).toBe(publicKeyId);
  });

  /**
   * @todo: write test code for `forged` case
   */
});
