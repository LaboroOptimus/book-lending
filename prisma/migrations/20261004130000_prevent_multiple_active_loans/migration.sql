-- Historical loans are allowed; only one unfinished loan per book is allowed.
CREATE UNIQUE INDEX "Loan_one_active_loan_per_book"
ON "Loan"("bookId")
WHERE "returnedAt" IS NULL;
