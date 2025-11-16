import { normalizeID } from '@/app/api/utils/normalize-id';

describe('normalizeID', () => {
  it('should normalize ID with INF prefix for influencer', () => {
    const result = normalizeID('123', 'influencer');
    expect(result).toBe('INF-123');
  });

  it('should normalize ID with IND prefix for individual', () => {
    const result = normalizeID('456', 'individual');
    expect(result).toBe('IND-456');
  });

  it('should handle existing INF prefix', () => {
    const result = normalizeID('INF-789', 'individual');
    expect(result).toBe('INF-789');
  });

  it('should handle existing IND prefix', () => {
    const result = normalizeID('IND-012', 'influencer');
    expect(result).toBe('IND-012');
  });

  it('should pad numbers to at least 3 digits', () => {
    const result = normalizeID('5', 'influencer');
    expect(result).toBe('INF-005');
  });

  it('should handle larger numbers without truncating', () => {
    const result = normalizeID('123456', 'individual');
    expect(result).toBe('IND-123456');
  });
});
