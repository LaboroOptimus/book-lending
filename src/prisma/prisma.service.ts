import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    // PostgreSQL's default `contains` filter is case-sensitive. AdminJS uses
    // that filter for its text search, so make catalogue searches user-friendly.
    this.$use(async (params, next) => {
      if (params.model === 'Book' || params.model === 'Author') {
        this.makeContainsFiltersCaseInsensitive((params.args as any)?.where);
      }
      return next(params);
    });
  }

  private makeContainsFiltersCaseInsensitive(filter: unknown): void {
    if (!filter || typeof filter !== 'object') return;

    if (Array.isArray(filter)) {
      filter.forEach((item) => this.makeContainsFiltersCaseInsensitive(item));
      return;
    }

    const value = filter as Record<string, unknown>;
    if (typeof value.contains === 'string') value.mode = 'insensitive';
    Object.values(value).forEach((item) => this.makeContainsFiltersCaseInsensitive(item));
  }

  async onModuleInit(): Promise<void> { await this.$connect(); }
  async onModuleDestroy(): Promise<void> { await this.$disconnect(); }
}
