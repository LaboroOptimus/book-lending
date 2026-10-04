-- Initial Book Lending schema. Generated from prisma/schema.prisma.
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'LIBRARIAN');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'LIBRARIAN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Book" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "isbn" TEXT NOT NULL,
  "publishedYear" INTEGER, "description" TEXT, "coverImageUrl" TEXT,
  "coverImageKey" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Author" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "biography" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Member" (
  "id" TEXT NOT NULL, "fullName" TEXT NOT NULL, "email" TEXT NOT NULL,
  "phone" TEXT, "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Loan" (
  "id" TEXT NOT NULL, "bookId" TEXT NOT NULL, "memberId" TEXT NOT NULL,
  "loanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL, "returnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_AuthorToBook" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
CREATE INDEX "Book_title_idx" ON "Book"("title");
CREATE INDEX "Author_name_idx" ON "Author"("name");
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
CREATE INDEX "Member_fullName_idx" ON "Member"("fullName");
CREATE INDEX "Loan_bookId_idx" ON "Loan"("bookId");
CREATE INDEX "Loan_memberId_idx" ON "Loan"("memberId");
CREATE INDEX "Loan_dueDate_idx" ON "Loan"("dueDate");
CREATE UNIQUE INDEX "_AuthorToBook_AB_unique" ON "_AuthorToBook"("A", "B");
CREATE INDEX "_AuthorToBook_B_index" ON "_AuthorToBook"("B");

ALTER TABLE "Loan" ADD CONSTRAINT "Loan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_AuthorToBook" ADD CONSTRAINT "_AuthorToBook_A_fkey" FOREIGN KEY ("A") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AuthorToBook" ADD CONSTRAINT "_AuthorToBook_B_fkey" FOREIGN KEY ("B") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
