import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'selvacore-rules-test';
const ORDER_ID = 'order-scenario-3';
const OWNER_UID = 'cust-A';
const ATTACKER_UID = 'cust-B';
const TECH_UID = 'tech-1';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe('reviews security rules', () => {
  it('denies second setDoc from a different customer (scenario 3 ownership guard)', async () => {
    // Seed: completed order owned by A, and an existing review doc owned by A
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'orders', ORDER_ID), {
        status: 'completed',
        customerId: OWNER_UID,
        technicianId: TECH_UID,
      });
      await setDoc(doc(db, 'reviews', ORDER_ID), {
        orderId: ORDER_ID,
        customerId: OWNER_UID,
        technicianId: TECH_UID,
        rating: 5,
        comment: 'Legit review by owner',
        hidden: false,
        flagged: false,
        editableUntil: Timestamp.fromDate(new Date('2099-01-01T00:00:00Z')),
        createdAt: Timestamp.now(),
      });
    });

    // Attacker B authenticates and tries to overwrite the review, claiming ownership
    const attacker = env.authenticatedContext(ATTACKER_UID).firestore();
    await assertFails(
      setDoc(doc(attacker, 'reviews', ORDER_ID), {
        orderId: ORDER_ID,
        customerId: ATTACKER_UID,
        technicianId: TECH_UID,
        rating: 1,
        comment: 'Hijack attempt',
        hidden: false,
        flagged: false,
        editableUntil: Timestamp.fromDate(new Date('2099-01-01T00:00:00Z')),
        createdAt: Timestamp.now(),
      })
    );
  });

  it('denies update by owner after the edit window has expired', async () => {
    // Seed review with editableUntil in the past
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'reviews', ORDER_ID), {
        orderId: ORDER_ID,
        customerId: OWNER_UID,
        technicianId: TECH_UID,
        rating: 5,
        comment: 'Original',
        hidden: false,
        flagged: false,
        editableUntil: Timestamp.fromDate(new Date('2020-01-01T00:00:00Z')),
        createdAt: Timestamp.now(),
      });
    });

    const owner = env.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(owner, 'reviews', ORDER_ID), {
        rating: 3,
        comment: 'Too late',
      })
    );
  });

  it('denies create when the referenced order status is pending', async () => {
    // Seed an order in pending state (no review yet)
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'orders', ORDER_ID), {
        status: 'pending',
        customerId: OWNER_UID,
        technicianId: TECH_UID,
      });
    });

    const owner = env.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(owner, 'reviews', ORDER_ID), {
        orderId: ORDER_ID,
        customerId: OWNER_UID,
        technicianId: TECH_UID,
        rating: 5,
        comment: 'Early review',
        hidden: false,
        flagged: false,
        editableUntil: Timestamp.fromDate(new Date('2099-01-01T00:00:00Z')),
        createdAt: Timestamp.now(),
      })
    );
  });
});
