import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courtsForDisplay, sampleCourts } from '../src/lib/sampleCourts';

const realCourt = {
  id: 'real-court',
  name: 'A real court',
  city: 'Yangon',
  sportType: 'FUTSAL',
  basePricePerHour: 15000,
};

test('sample courts appear only for a successful unfiltered empty directory', () => {
  assert.deepEqual(courtsForDisplay([]), sampleCourts);
  assert.ok(courtsForDisplay([]).every((court) => court.isSample));
});

test('real courts replace sample courts immediately', () => {
  assert.deepEqual(courtsForDisplay([realCourt]), [realCourt]);
});

test('sample courts never mask empty filtered results or a failed request', () => {
  assert.deepEqual(courtsForDisplay([], { filtersActive: true }), []);
  assert.deepEqual(courtsForDisplay([], { loadFailed: true }), []);
});