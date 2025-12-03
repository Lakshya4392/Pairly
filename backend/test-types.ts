import { Prisma } from '@prisma/client';

const data: Prisma.InvitedUserCreateInput = {
    email: 'test@example.com',
    source: 'test',
};

console.log('Type check passed');
