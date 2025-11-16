import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names and removes conflicting tailwind utilities', () => {
    expect(cn('p-2', 'p-4', 'bg-red-500')).toBe('p-4 bg-red-500');
  });

  it('handles conditional inputs and arrays', () => {
    const result = cn('mt-2', ['px-3', false && 'hidden'], { 'text-sm': true, 'text-lg': false }, null);
    expect(result).toBe('mt-2 px-3 text-sm');
  });
});
