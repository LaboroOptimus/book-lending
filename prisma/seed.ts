import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const librarianPassword = process.env.SEED_LIBRARIAN_PASSWORD;
if (!adminPassword || !librarianPassword) throw new Error('Set SEED_ADMIN_PASSWORD and SEED_LIBRARIAN_PASSWORD before running the seed.');

const authorNames = ['Maya Angelou', 'James Baldwin', 'Octavia E. Butler', 'Italo Calvino', 'Joan Didion', 'Ursula K. Le Guin', 'Toni Morrison', 'Haruki Murakami', 'George Orwell', 'Virginia Woolf'];

async function main(): Promise<void> {
  const authors = await Promise.all(authorNames.map((name) => prisma.author.upsert({
    where: { name }, update: {}, create: { name, biography: `${name} is represented in the library catalogue.` },
  })));
  const books = await Promise.all(Array.from({ length: 30 }, (_, index) => prisma.book.upsert({
    where: { isbn: `978-1-55555-${String(index).padStart(3, '0')}-${index % 10}` },
    update: {},
    create: { title: `Library Collection Volume ${index + 1}`, isbn: `978-1-55555-${String(index).padStart(3, '0')}-${index % 10}`, publishedYear: 1980 + (index % 44), description: `A realistic demo record for catalogue searching and filtering. Volume ${index + 1}.`, authors: { connect: [{ id: authors[index % authors.length].id }, { id: authors[(index + 3) % authors.length].id }] } },
  })));
  const members = await Promise.all(Array.from({ length: 50 }, (_, index) => prisma.member.upsert({
    where: { email: `member${index + 1}@example.test` }, update: {},
    create: { fullName: `Demo Member ${index + 1}`, email: `member${index + 1}@example.test`, phone: `+1-555-01${String(index).padStart(2, '0')}` },
  })));
  const now = new Date();
  await Promise.all(books.slice(0, 12).map(async (book, index) => {
    const existing = await prisma.loan.findFirst({ where: { bookId: book.id } });
    if (existing) return;
    const returnedAt = index < 5 ? new Date(now.getTime() - (index + 1) * 86400000) : null;
    const dueDate = index < 5 ? new Date(now.getTime() - (index + 8) * 86400000) : index < 9 ? new Date(now.getTime() + (index + 3) * 86400000) : new Date(now.getTime() - (index - 8) * 86400000);
    await prisma.loan.create({ data: { bookId: book.id, memberId: members[index].id, loanedAt: new Date(now.getTime() - 14 * 86400000), dueDate, returnedAt } });
  }));
  await prisma.user.upsert({ where: { email: 'admin@book-lending.test' }, update: { passwordHash: await bcrypt.hash(adminPassword, 12), role: UserRole.ADMIN }, create: { email: 'admin@book-lending.test', passwordHash: await bcrypt.hash(adminPassword, 12), role: UserRole.ADMIN } });
  await prisma.user.upsert({ where: { email: 'librarian@book-lending.test' }, update: { passwordHash: await bcrypt.hash(librarianPassword, 12), role: UserRole.LIBRARIAN }, create: { email: 'librarian@book-lending.test', passwordHash: await bcrypt.hash(librarianPassword, 12), role: UserRole.LIBRARIAN } });
}
main().finally(() => prisma.$disconnect());
