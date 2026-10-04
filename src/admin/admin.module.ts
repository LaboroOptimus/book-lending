import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
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
                listProperties: ['bookId', 'memberId', 'loanedAt', 'dueDate', 'returnedAt'],
                filterProperties: ['bookId', 'memberId', 'dueDate', 'returnedAt'],
                properties: { createdAt: { isVisible: false }, updatedAt: { isVisible: false } },
                actions: {
                  list: { isAccessible: canManage('Loan') }, show: { isAccessible: canManage('Loan') }, new: { isAccessible: canManage('Loan') }, edit: { isAccessible: canManage('Loan') }, delete: { isAccessible: canManage('Loan') },
                  markReturned: {
                    actionType: 'bulk',
                    label: 'Mark selected loans as returned',
                    isAccessible: canManage('Loan'),
                    handler: async (request: any) => {
                      const ids = request.payload?.recordIds ?? [];
                      const results = await Promise.allSettled(ids.map((id: string) => loansService.returnLoan(id)));
                      const returned = results.filter((result) => result.status === 'fulfilled').length;
                      return { notice: { message: `Marked ${returned} loan(s) as returned.`, type: 'success' }, records: [] };
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
          cookieName: 'book-lending.sid',
          cookiePassword: config.getOrThrow('SESSION_SECRET'),
        },
        sessionOptions: {
          secret: config.getOrThrow('SESSION_SECRET'),
          resave: false,
          saveUninitialized: false,
          cookie: { httpOnly: true, sameSite: 'lax', secure: config.getOrThrow('NODE_ENV') === 'production', maxAge: 8 * 60 * 60 * 1000 },
        },
      };
    },
  }));
}
