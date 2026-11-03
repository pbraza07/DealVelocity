import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addressInput, normalizeStreet, pascoAddress } from '../lib/address-lookup.ts';

test('street suffix and address context normalization', () => {
  assert.equal(normalizeStreet('29970 Chapel Chase Drive  '), '29970 CHAPEL CHASE DR');
  assert.equal(addressInput('29970 Chapel Chase Dr', 'Wesley Chapel, Florida'), '29970 Chapel Chase Dr, Wesley Chapel, Florida');
  assert.equal(addressInput('29970 Chapel Chase Dr, Wesley Chapel, FL', 'Atlanta, GA'), '29970 Chapel Chase Dr, Wesley Chapel, FL');
});

test('parcel matching requires unique physical street, city, state and supplied ZIP', async () => {
  const realFetch = globalThis.fetch;
  const parcel = {DIR_ID:'2025320020000000030',PHYS_STREET:'29970 CHAPEL CHASE DRIVE  ',PHYS_CITY:'WESLEY CHAPEL',PHYS_STATE:'FL',PHYS_ZIP:'33545'};
  let features = [{attributes:parcel}];
  let truncated = false;
  globalThis.fetch = async () => new Response(JSON.stringify({features,exceededTransferLimit:truncated}));
  try {
    for (const full of ['29970 Chapel Chase Dr, Wesley Chapel, FL 33545','29970 Chapel Chase Dr, Wesley Chapel, Florida','29970 Chapel Chase Dr, Wesley Chapel FL']) {
      assert.equal((await pascoAddress(full))?.matchType, 'county_parcel');
    }
    assert.equal(await pascoAddress('29970 Chapel Chase Dr, Wesley Chapel, GA'), null);
    assert.equal(await pascoAddress('29970 Chapel Chase Dr, Wesley Chapel, FL 33544'), null);
    assert.equal(await pascoAddress('29971 Chapel Chase Dr, Wesley Chapel, FL'), null);
    assert.equal(await pascoAddress('29970 Chapel Chase Dr, Tampa, FL'), null);
    features = [{attributes:parcel},{attributes:parcel}];
    assert.equal(await pascoAddress('29970 Chapel Chase Dr, Wesley Chapel, FL'), null);
    features = [{attributes:parcel}]; truncated = true;
    assert.equal(await pascoAddress('29970 Chapel Chase Dr, Wesley Chapel, FL'), null);
  } finally { globalThis.fetch = realFetch; }
});
