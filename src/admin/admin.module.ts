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
      const canManage = (resource: AdminResource) => ({ currentAdmin }: any) =>
        Boolean(currentAdmin && authService.canManage(currentAdmin.role as UserRole, resource));
      const model = (name: string) => ({ model: prismaAdapter.getModelByName(name), client: prisma });
      const PgSession = connectPgSimple(session);
      const isProduction = config.getOrThrow('NODE_ENV') === 'production';

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
                  coverImageUrl: { components: { edit: coverUpload, new: coverUpload }, isVisible: { list: false, filter: false, show: true, edit: true } },
                  coverImageKey: { isVisible: false },
                  createdAt: { isVisible: false },
                  updatedAt: { isVisible: false },
                },
                actions: { list: { isAccessible: canManage('Book') }, show: { isAccessible: canManage('Book') }, new: { isAccessible: canManage('Book') }, edit: { isAccessible: canManage('Book') }, delete: { isAccessible: canManage('Book') } },
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
                    isAccessible: canManage('Loan'),
                    handler: async (request: any, _response: any, context: any) => {
                      const requestedIds = request.payload?.recordIds ?? request.query?.recordIds;
                      const ids = context.records?.map((record: any) => record.id())
                        ?? (Array.isArray(requestedIds) ? requestedIds : requestedIds ? [requestedIds] : []);
                      const results = await Promise.allSettled(ids.map((id: string) => loansService.returnLoan(id)));
                      const returned = results.filter((result) => result.status === 'fulfilled').length;
                      return {
                        redirectUrl: context.h.resourceUrl({ resourceId: context.resource.id() }),
                        notice: { message: `Marked ${returned} loan(s) as returned.`, type: 'success' },
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
