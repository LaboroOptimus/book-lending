import { getLoanStatus, LoanStatus } from './loan-status';
const now = new Date('2026-10-04T12:00:00.000Z');
describe('getLoanStatus', () => {
  it('returns RETURNED when returnedAt is set', () => expect(getLoanStatus({ dueDate: new Date('2026-09-01'), returnedAt: now }, now)).toBe(LoanStatus.RETURNED));
  it('returns OVERDUE for an unfinished loan past its due date', () => expect(getLoanStatus({ dueDate: new Date('2026-10-03'), returnedAt: null }, now)).toBe(LoanStatus.OVERDUE));
  it('returns ACTIVE for an unfinished loan before its due date', () => expect(getLoanStatus({ dueDate: new Date('2026-10-05'), returnedAt: null }, now)).toBe(LoanStatus.ACTIVE));
});
