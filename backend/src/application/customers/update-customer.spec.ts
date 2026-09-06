import { beforeEach, describe, expect, it } from 'vitest';

import { Customer } from '../../domain/entities/customer.js';
import {
  CustomerNotFoundError,
  DuplicateCustomerPhoneError,
} from '../../domain/errors/customer-errors.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { UpdateCustomer } from './update-customer.js';

const OWNER_ID = 'owner-1';
const CREATED_AT = new Date('2026-03-08T10:00:00Z');

describe('UpdateCustomer', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let updateCustomer: UpdateCustomer;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    updateCustomer = new UpdateCustomer(unitOfWork.repositories.customers);

    await unitOfWork.repositories.customers.save(
      Customer.create({
        id: 'customer-1',
        ownerId: OWNER_ID,
        name: 'Ana Torres',
        createdAt: CREATED_AT,
      }),
    );
  });

  it('adds a phone to a customer registered without one', async () => {
    const updated = await updateCustomer.execute({
      actorId: OWNER_ID,
      customerId: 'customer-1',
      phone: '300 111 2233',
    });

    expect(updated.phone).toBe('3001112233');
    expect(updated.name).toBe('Ana Torres');
  });

  it('leaves the phone alone when it is not part of the command', async () => {
    await updateCustomer.execute({
      actorId: OWNER_ID,
      customerId: 'customer-1',
      phone: '3001112233',
    });

    const updated = await updateCustomer.execute({
      actorId: OWNER_ID,
      customerId: 'customer-1',
      name: 'Ana María Torres',
    });

    expect(updated.phone).toBe('3001112233');
  });

  it('clears the phone when it is set to null', async () => {
    await updateCustomer.execute({
      actorId: OWNER_ID,
      customerId: 'customer-1',
      phone: '3001112233',
    });

    const updated = await updateCustomer.execute({
      actorId: OWNER_ID,
      customerId: 'customer-1',
      phone: null,
    });

    expect(updated.phone).toBeNull();
  });

  it('refuses a phone that belongs to another customer', async () => {
    await unitOfWork.repositories.customers.save(
      Customer.create({
        id: 'customer-2',
        ownerId: OWNER_ID,
        name: 'Carlos Ruiz',
        phone: '3009998877',
        createdAt: CREATED_AT,
      }),
    );

    await expect(
      updateCustomer.execute({
        actorId: OWNER_ID,
        customerId: 'customer-1',
        phone: '3009998877',
      }),
    ).rejects.toThrow(DuplicateCustomerPhoneError);
  });

  it('accepts the phone the customer already has', async () => {
    await updateCustomer.execute({
      actorId: OWNER_ID,
      customerId: 'customer-1',
      phone: '3001112233',
    });

    const updated = await updateCustomer.execute({
      actorId: OWNER_ID,
      customerId: 'customer-1',
      name: 'Ana Torres',
      phone: '3001112233',
    });

    expect(updated.phone).toBe('3001112233');
  });

  it('refuses a customer of another organizer', async () => {
    await expect(
      updateCustomer.execute({
        actorId: 'someone-else',
        customerId: 'customer-1',
        phone: '3001112233',
      }),
    ).rejects.toThrow(CustomerNotFoundError);
  });
});
