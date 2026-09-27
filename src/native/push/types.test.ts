import { describe, expect, it } from 'vitest';

import { UnknownCategoryError } from './types';

describe('UnknownCategoryError', () => {
  it('is an Error that names the category and stays instanceof-safe', () => {
    const error = new UnknownCategoryError('gate');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UnknownCategoryError);
    expect(error.name).toBe('UnknownCategoryError');
    expect(error.categoryId).toBe('gate');
    expect(error.message).toMatch(/"gate"/);
  });
});
