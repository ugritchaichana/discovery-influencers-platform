import { canActOnRole, canCreateRole, canUpdateRole, canDeleteRole } from '@/lib/auth/permissions';

describe('role permissions', () => {
  const matrix: Array<[Parameters<typeof canActOnRole>, boolean]> = [
    [['superadmin', 'admin', 'create'], true],
    [['superadmin', 'superadmin', 'update'], false],
    [['admin', 'editor', 'update'], true],
    [['admin', 'superadmin', 'update'], false],
    [['editor', 'user', 'delete'], true],
    [['editor', 'user', 'create'], false],
    [['user', 'user', 'update'], true],
    [['user', 'editor', 'update'], false],
  ];

  it.each(matrix)('canActOnRole(%j) returns %s', (args, expected) => {
    expect(canActOnRole(...args)).toBe(expected);
  });

  it('exposes convenience helpers that delegate to canActOnRole', () => {
    expect(canCreateRole('admin', 'user')).toBe(true);
    expect(canUpdateRole('editor', 'user')).toBe(true);
    expect(canDeleteRole('user', 'user')).toBe(false);
  });
});
