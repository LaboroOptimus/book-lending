import { Loan } from '@prisma/client';

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  RETURNED = 'RETURNED',
}

/** Keeps status derived from dates instead of storing mutable state. */
export function getLoanStatus(
  loan: Pick<Loan, 'dueDate' | 'returnedAt'>,
  now: Date = new Date(),
): LoanStatus {
  if (loan.returnedAt !== null) return LoanStatus.RETURNED;
  return loan.dueDate.getTime() < now.getTime()
    ? LoanStatus.OVERDUE
    : LoanStatus.ACTIVE;
}
