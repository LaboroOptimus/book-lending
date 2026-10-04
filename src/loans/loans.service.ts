import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Loan, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getLoanStatus, LoanStatus } from './loan-status';

export type CreateLoanInput = {
  bookId: string;
  memberId: string;
  dueDate: Date;
  loanedAt?: Date;
};

export type LoanWithStatus = Loan & { status: LoanStatus };

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateLoanInput): Promise<LoanWithStatus> {
    const loanedAt = input.loanedAt ?? new Date();
    if (input.dueDate <= loanedAt) {
      throw new ConflictException('The due date must be after the loan date.');
    }

    try {
      const loan = await this.prisma.$transaction(
        async (tx) => {
          const [book, member] = await Promise.all([
            tx.book.findUnique({ where: { id: input.bookId }, select: { id: true } }),
            tx.member.findUnique({ where: { id: input.memberId }, select: { id: true } }),
          ]);
          if (!book) throw new NotFoundException('Book not found.');
          if (!member) throw new NotFoundException('Member not found.');

          const activeLoan = await tx.loan.findFirst({
            where: { bookId: input.bookId, returnedAt: null },
            select: { id: true },
          });
          if (activeLoan) throw new ConflictException('This book is already on loan.');

          return tx.loan.create({
            data: { ...input, loanedAt },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return this.withStatus(loan);
    } catch (error) {
      // The database index is the final guard if two requests race.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This book is already on loan.');
      }
      throw error;
    }
  }

  async returnLoan(id: string, returnedAt: Date = new Date()): Promise<LoanWithStatus> {
    const updated = await this.prisma.loan.updateMany({
      where: { id, returnedAt: null },
      data: { returnedAt },
    });
    if (updated.count === 0) {
      const existing = await this.prisma.loan.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Loan not found.');
      throw new ConflictException('This loan has already been returned.');
    }
    const loan = await this.prisma.loan.findUniqueOrThrow({ where: { id } });
    return this.withStatus(loan, returnedAt);
  }

  status(loan: Loan, now: Date = new Date()): LoanStatus {
    return getLoanStatus(loan, now);
  }

  private withStatus(loan: Loan, now: Date = new Date()): LoanWithStatus {
    return { ...loan, status: this.status(loan, now) };
  }
}
