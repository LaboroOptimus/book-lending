import { ConflictException } from '@nestjs/common';
import { LoansService } from './loans.service';
describe('LoansService', () => {
  it('rejects a loan when the book already has an active loan', async () => {
    const tx = { book: { findUnique: jest.fn().mockResolvedValue({ id: 'book-1' }) }, member: { findUnique: jest.fn().mockResolvedValue({ id: 'member-1' }) }, loan: { findFirst: jest.fn().mockResolvedValue({ id: 'loan-1' }) } };
    const service = new LoansService({ $transaction: jest.fn((callback) => callback(tx)) } as any);
    await expect(service.create({ bookId: 'book-1', memberId: 'member-1', dueDate: new Date(Date.now() + 86400000) })).rejects.toBeInstanceOf(ConflictException);
  });
});
