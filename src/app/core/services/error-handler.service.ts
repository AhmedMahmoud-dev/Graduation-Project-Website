import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  /**
   * Translates HttpErrorResponse into user-friendly message
   */
  handleError(error: HttpErrorResponse): string {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = error.error.message;
    } else {
      // Server-side error - prioritize API provided message
      if (error.error?.message) {
        return error.error.message;
      }

      switch (error.status) {
        case 400:
          errorMessage = 'Bad Request. Please check your data.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please login again.';
          break;
        case 403:
          errorMessage = 'Forbidden. You do not have permission to access this resource.';
          break;
        case 404:
          errorMessage = 'Resource not found.';
          break;
        case 422:
          errorMessage = 'Validation Error. Please check your input.';
          break;
        case 500:
          errorMessage = 'Internal Server Error. Please contact support.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.statusText || 'Unknown Error'}`;
      }
    }

    return errorMessage;
  }
}
