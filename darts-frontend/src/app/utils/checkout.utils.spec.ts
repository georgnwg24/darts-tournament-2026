import { findCheckoutPath } from './checkout.utils';

describe('findCheckoutPath', () => {
  it('finds a one-dart checkout', () => {
    expect(findCheckoutPath(60, 1)).toEqual(['T20']);
    expect(findCheckoutPath(50, 1)).toEqual(['DB']);
    expect(findCheckoutPath(20, 1)).toEqual(['20']);
  });

  it('uses no more than the available darts', () => {
    const path = findCheckoutPath(100, 2);

    expect(path).not.toBeNull();
    expect(path!.length).toBeLessThanOrEqual(2);
  });

  it('rejects impossible or non-positive checkouts', () => {
    expect(findCheckoutPath(61, 1)).toBeNull();
    expect(findCheckoutPath(181, 3)).toBeNull();
    expect(findCheckoutPath(0, 3)).toBeNull();
  });
});
