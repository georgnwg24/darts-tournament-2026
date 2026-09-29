import { HttpErrorResponse } from '@angular/common/http';
import { formatHttpError } from './api-error.interceptor';

describe('formatHttpError', () => {
  it('preserves the existing server error message format', () => {
    expect(
      formatHttpError(
        new HttpErrorResponse({ status: 400, error: { message: 'invalid' } }),
      ),
    ).toBe('Server returned code 400, body was: {"message":"invalid"}');
  });
});
