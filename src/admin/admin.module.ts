import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import path from 'path';
import { AuthService, AdminResource } from '../auth/auth.service';
import { LoansModule } from '../loans/loans.module';
import { LoansService } from '../loans/loans.service';
import { PrismaService } from '../prisma/prisma.service';

const loadEsm = new Function('moduleName', 'return import(moduleName)') as (
  moduleName: string,
) => Promise<any>;

export function createAdminModule(): Promise<any> {
  return loadEsm('@adminjs/nestjs').then(({ AdminModule }) => AdminModule.createAdminAsync({
    imports: [LoansModule],
    inject: [PrismaService, AuthService, LoansService, ConfigService],
    useFactory: async (
      prisma: PrismaService,
      authService: AuthService,
      loansService: LoansService,
      config: ConfigService,
    ) => {
      const [adminjs, prismaAdapter] = await Promise.all([
        loadEsm('adminjs'),
        loadEsm('@adminjs/prisma'),
      ]);
      adminjs.default.registerAdapter({
        Database: prismaAdapter.Database,
        Resource: prismaAdapter.Resource,
      });

      const componentLoader = new adminjs.ComponentLoader();
      const coverUpload = componentLoader.add(
        'CoverUpload',
        path.join(process.cwd(), 'src/admin/components/cover-upload'),
      );
      componentLoader.override(
        'SelectedRecords',
        path.join(process.cwd(), 'src/admin/components/selected-records'),
      );
      componentLoader.override(
        'FilterDrawer',
        path.join(process.cwd(), 'src/admin/components/filter-drawer'),
      );
      const canManage = (resource: AdminResource) => ({ currentAdmin }: any) =>
        Boolean(currentAdmin && authService.canManage(currentAdmin.role as UserRole, resource));
      const model = (name: string) => ({ model: prismaAdapter.getModelByName(name), client: prisma });
      const PgSession = connectPgSimple(session);
      const isProduction = config.getOrThrow('NODE_ENV') === 'production';
      const getAuthorIds = (payload: Record<string, unknown> = {}): string[] => {
        if (payload.authorIds === '__FORM_VALUE_EMPTY_ARRAY__') return [];
        if (Array.isArray(payload.authorIds)) return payload.authorIds.filter((id): id is string => typeof id === 'string');

        return Object.entries(payload)
          .filter(([key, value]) => key.startsWith('authorIds.') && typeof value === 'string')
          .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
          .map(([, value]) => value as string);
      };
      const captureAuthorIds = async (request: any) => {
        if (request.method === 'post') {
          request.payload.__authorIds = getAuthorIds(request.payload);
        }
        return request;
      };
      const syncBookAuthors = async (response: any, request: any) => {
        const bookId = response.record?.id;
        if (!bookId) return response;

        if (request.method === 'post') {
          const authorIds = request.payload.__authorIds as string[];
          await prisma.book.update({
            where: { id: bookId },
            data: { authors: { set: authorIds.map((id) => ({ id })) } },
          });
        }

        const authors = await prisma.author.findMany({
          where: { books: { some: { id: bookId } } },
          orderBy: { name: 'asc' },
          select: { id: true },
        });
        response.record.params = {
          ...response.record.params,
          ...Object.fromEntries(authors.map((author, index) => [`authorIds.${index}`, author.id])),
        };
        return response;
      };

      return {
        adminJsOptions: {
          rootPath: '/admin',
          componentLoader,
          assets: { scripts: ['/csrf.js'] },
          branding: { companyName: 'Book Lending Library', withMadeWithLove: false },
          resources: [
            {
              resource: model('Book'),
              options: {
                navigation: 'Catalog',
                listProperties: ['title', 'isbn', 'publishedYear', 'coverImageUrl'],
                filterProperties: ['title', 'isbn', 'publishedYear'],
                searchProperties: ['title', 'isbn'],
                properties: {
                  authorIds: {
                    type: 'string',
                    isArray: true,
                    reference: 'Author',
                    label: 'Authors',
                    position: 30,
                    isVisible: { list: false, filter: false, show: false, edit: true },
                  },
                  coverImageUrl: { components: { edit: coverUpload, new: coverUpload }, isVisible: { list: false, filter: false, show: true, edit: true } },
                  coverImageKey: { isVisible: false },
                  createdAt: { isVisible: false },
                  updatedAt: { isVisible: false },
                },
                actions: {
                  list: { isAccessible: canManage('Book') },
                  show: { isAccessible: canManage('Book') },
                  new: {
                    isAccessible: canManage('Book'),
                    before: captureAuthorIds,
                    after: syncBookAuthors,
                  },
                  edit: {
                    isAccessible: canManage('Book'),
                    before: captureAuthorIds,
                    after: syncBookAuthors,
                  },
                  delete: { isAccessible: canManage('Book') },
                },
              },
            },
            {
              resource: model('Author'),
              options: { navigation: 'Catalog', searchProperties: ['name'], actions: { list: { isAccessible: canManage('Author') }, show: { isAccessible: canManage('Author') }, new: { isAccessible: canManage('Author') }, edit: { isAccessible: canManage('Author') }, delete: { isAccessible: canManage('Author') } } },
            },
            {
              resource: model('Member'),
              options: { navigation: 'Circulation', listProperties: ['fullName', 'email', 'phone', 'joinedAt'], filterProperties: ['joinedAt'], searchProperties: ['fullName', 'email'], actions: { list: { isAccessible: canManage('Member') }, show: { isAccessible: canManage('Member') }, new: { isAccessible: canManage('Member') }, edit: { isAccessible: canManage('Member') }, delete: { isAccessible: canManage('Member') } } },
            },
            {
              resource: model('Loan'),
              options: {
                navigation: 'Circulation',
                listProperties: ['book', 'member', 'loanedAt', 'dueDate', 'returnedAt'],
                filterProperties: ['book', 'member', 'dueDate', 'returnedAt'],
                properties: { createdAt: { isVisible: false }, updatedAt: { isVisible: false } },
                actions: {
                  list: { isAccessible: canManage('Loan') }, show: { isAccessible: canManage('Loan') },
                  new: {
                    isAccessible: canManage('Loan'),
                    before: async (request: any) => {
                      if (request.method !== 'post') return request;
                      const bookId = request.payload?.book ?? request.payload?.bookId;
                      const loanedAt = new Date(request.payload?.loanedAt);
                      const dueDate = new Date(request.payload?.dueDate);
                      const errors: Record<string, { message: string }> = {};
                      if (bookId && await prisma.loan.findFirst({ where: { bookId, returnedAt: null }, select: { id: true } })) {
                        errors.book = { message: 'This book is already on loan. Return its active loan before lending it again.' };
                      }
                      if (Number.isNaN(dueDate.getTime()) || dueDate <= loanedAt) {
                        errors.dueDate = { message: 'The due date must be after the loan date.' };
                      }
                      if (Object.keys(errors).length) throw new adminjs.ValidationError(errors);
                      return request;
                    },
                  },
                  edit: { isAccessible: canManage('Loan') }, delete: { isAccessible: canManage('Loan') },
                  markReturned: {
                    actionType: 'bulk',
                    label: 'Mark selected loans as returned',
                    // Run the request directly from the list. Without this AdminJS opens
                    // a dedicated bulk-action route before it can display the notice.
                    component: false,
                    isAccessible: canManage('Loan'),
                    handler: async (request: any, _response: any, context: any) => {
                      const requestedIds = request.payload?.recordIds ?? request.query?.recordIds;
                      const ids = context.records?.map((record: any) => record.id())
                        ?? (Array.isArray(requestedIds) ? requestedIds : requestedIds ? [requestedIds] : []);
                      const results = await Promise.allSettled(ids.map((id: string) => loansService.returnLoan(id)));
                      const returned = results.filter((result) => result.status === 'fulfilled').length;
                      const alreadyReturned = results.filter((result) => (
                        result.status === 'rejected'
                        && String(result.reason?.message ?? '').includes('already been returned')
                      )).length;

                      return {
                        notice: returned > 0
                          ? {
                              message: alreadyReturned > 0
                                ? `Returned ${returned} loan(s). ${alreadyReturned} selected loan(s) had already been returned.`
                                : returned === 1
                                  ? 'Book returned successfully.'
                                  : `Returned ${returned} loans successfully.`,
                              type: 'success',
                            }
                          : {
                              message: alreadyReturned > 0
                                ? 'The selected loan has already been returned.'
                                : 'No loans were returned.',
                              type: 'error',
                            },
                        records: [],
                      };
                    },
                  },
                },
              },
            },
            {
              resource: model('User'),
              options: { navigation: 'Settings', properties: { passwordHash: { isVisible: false }, createdAt: { isVisible: false }, updatedAt: { isVisible: false } }, actions: { list: { isAccessible: canManage('User') }, show: { isAccessible: canManage('User') }, new: { isAccessible: canManage('User') }, edit: { isAccessible: canManage('User') }, delete: { isAccessible: canManage('User') } } },
            },
          ],
        },
        auth: {
          authenticate: (email: string, password: string) => authService.validateCredentials(email, password),
          cookieName: isProduction ? '__Host-book-lending.sid' : 'book-lending.sid',
          cookiePassword: config.getOrThrow('SESSION_SECRET'),
        },
        sessionOptions: {
          store: new PgSession({
            conString: config.getOrThrow('DATABASE_URL'),
            tableName: 'user_session',
            createTableIfMissing: true,
          }),
          secret: config.getOrThrow('SESSION_SECRET'),
          resave: false,
          saveUninitialized: false,
          cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 8 * 60 * 60 * 1000 },
        },
      };
    },
  }));
}
