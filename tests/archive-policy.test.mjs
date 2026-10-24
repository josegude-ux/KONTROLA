import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCHIVE_AFTER_DAYS, eligibleForArchive, storageUsagePercent, storageWarning, archiveVerificationStatus } from '../src/archive-policy.mjs';

const now = new Date('2026-11-30T12:00:00.000Z');
const daysAgo = (days) => new Date(now.getTime() - days * 86400000).toISOString();
const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);

test('30 days exactly is eligible only when definitively finalized', () => {
  assert.equal(ARCHIVE_AFTER_DAYS, 30);
  assert.equal(eligibleForArchive({status:'finalizada',closedAt:daysAgo(30)},now),true);
  assert.equal(eligibleForArchive({status:'finalizada',closedAt:daysAgo(29)},now),false);
  assert.equal(eligibleForArchive({status:'preparacion_finalizada',closedAt:daysAgo(40)},now),false);
  assert.equal(eligibleForArchive({status:'finalizada',closedAt:daysAgo(-1)},now),false);
  assert.equal(eligibleForArchive({status:'finalizada',closedAt:'not-a-date'},now),false);
  assert.equal(eligibleForArchive({status:'finalizada'},now),false);
});

test('storage warnings begin at 70 percent; unknown quota stays unknown', () => {
  assert.equal(storageUsagePercent(69,100),69);
  assert.equal(storageWarning(70,100).status,'warning');
  assert.equal(storageWarning(69,100).status,'ok');
  assert.equal(storageWarning(0,0).status,'unknown');
  assert.equal(storageWarning(-1,100).status,'unknown');
  assert.equal(storageWarning(NaN,100).status,'unknown');
});

test('integrity confirmation requires matching valid SHA-256 and exact bytes', () => {
  assert.equal(archiveVerificationStatus({originalSha256:hashA,recoveredSha256:hashA.toUpperCase(),originalSize:123,recoveredSize:123}),'archivado_verificado');
  assert.equal(archiveVerificationStatus({originalSha256:hashA,recoveredSha256:hashB,originalSize:123,recoveredSize:123}),'error_verificacion');
  assert.equal(archiveVerificationStatus({originalSha256:hashA,recoveredSha256:hashA,originalSize:123,recoveredSize:124}),'error_verificacion');
  assert.equal(archiveVerificationStatus({originalSha256:hashA,originalSize:123}),'pendiente_de_confirmacion');
});
