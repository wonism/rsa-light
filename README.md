# RSA Light

![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/wonism/rsa-light/test-release/main)
![npm](https://img.shields.io/npm/v/rsa-light)
![npm bundle size](https://img.shields.io/bundlephobia/min/rsa-light)

RSA library that works on browser and node without any dependencies.

## Installation

```sh
# npm
$ npm i -S rsa-light
# yarn
$ yarn add rsa-light
```
## Usage

```ts
// without signature
import RSA from 'rsa-light';

const rsaKey = RSA.generateRSAKey(512);
const publicKeyString = RSA.publicKeyString(rsaKey);

const encryptionResult = RSA.encrypt('Some Plain Text', publicKeyString);
const decryptionResult = RSA.decrypt(encryptionResult, rsaKey);

console.log(decryptionResult.plainText);
console.log(decryptionResult.signature);
```

```ts
// with signature
import RSA from 'rsa-light';

const rsaKey = RSA.generateRSAKey(512);
const publicKeyString = RSA.publicKeyString(rsaKey);

const signature = RSA.generateRSAKey(512);

const encryptionResult = RSA.encrypt('Some Plain Text', publicKeyString, signature);
const publicKeyId = RSA.publicKeyId(RSA.publicKeyString(signature));
const decryptionResult = RSA.decrypt(encryptionResult, rsaKey);

console.log(publicKeyId);
console.log(decryptionResult.plainText);
console.log(decryptionResult.signature);
console.log(decryptionResult.publicKey);
console.log(RSA.publicKeyString(signature));
console.log(RSA.publicKeyId(decryptionResult.publicKey));
```
