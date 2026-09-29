import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export function formatHttpError(error: HttpErrorResponse): string {
  if (error.error instanceof ErrorEvent) {
    return `Error: ${error.error.message}`;
  }
  return `Server returned code ${error.status}, body was: ${JSON.stringify(error.error)}`;
}

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = formatHttpError(error);
      console.error(message);
      return throwError(() => new Error(message));
    }),
  );
