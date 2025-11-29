import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';

export abstract class BaseRepository<T> {
    protected prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }
}
