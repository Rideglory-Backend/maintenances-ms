/**
 * Unit tests for MaintenancesService — exercises the real service class
 * with the Prisma layer mocked via jest.fn().
 *
 * Coverage:
 *  softDeleteAllByUserId — M records across multiple vehicles for the same user,
 *  0 records (idempotent no-op), and idempotency on a second run.
 */

// Set required env vars BEFORE any module is loaded to pass joi validation
process.env.PORT = '3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.USERS_MS_PORT = '3001';
process.env.USERS_MS_HOST = 'localhost';

import { MaintenancesService } from './maintenances.service';

// ── Mock PrismaClient via the generated path ──────────────────────────────────

jest.mock('../generated/prisma', () => {
  return {
    PrismaClient: class {
      maintenance = {
        updateMany: jest.fn(),
      };
      $connect = jest.fn().mockResolvedValue(undefined);
    },
  };
});

// ── Mock PrismaPg adapter ─────────────────────────────────────────────────────

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

// ── Mock UsersService ClientProxy ─────────────────────────────────────────────

const mockUsersService = {
  send: jest.fn(),
};

describe('MaintenancesService', () => {
  let service: MaintenancesService;

  beforeEach(() => {
    service = new MaintenancesService(mockUsersService as any);
    jest.clearAllMocks();
  });

  describe('softDeleteAllByUserId', () => {
    it('soft-deletes every non-deleted maintenance record for the user, across vehicles', async () => {
      (service.maintenance.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.softDeleteAllByUserId('user-1');

      expect(service.maintenance.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDeleted: false },
        data: { isDeleted: true },
      });
      expect(result).toEqual({ count: 5 });
    });

    it('returns count:0 without error when the user has no maintenance records', async () => {
      (service.maintenance.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.softDeleteAllByUserId('user-without-records');

      expect(result).toEqual({ count: 0 });
    });

    it('is idempotent — running it twice yields count:0 on the second run', async () => {
      (service.maintenance.updateMany as jest.Mock).mockResolvedValueOnce({ count: 3 });

      const first = await service.softDeleteAllByUserId('user-1');
      expect(first).toEqual({ count: 3 });

      // Second run: the where clause still filters isDeleted:false, so a real DB
      // would return 0 matches now that all rows are already soft-deleted.
      (service.maintenance.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
      const second = await service.softDeleteAllByUserId('user-1');

      expect(second).toEqual({ count: 0 });
      expect(service.maintenance.updateMany).toHaveBeenCalledTimes(2);
      expect((service.maintenance.updateMany as jest.Mock).mock.calls[1][0]).toEqual({
        where: { userId: 'user-1', isDeleted: false },
        data: { isDeleted: true },
      });
    });
  });
});
