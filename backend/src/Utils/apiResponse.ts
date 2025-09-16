export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

class ApiResponse {
  static success<T>(data: T, message = "Success"): IApiResponse<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message = "Error occurred"): IApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
    };
  }
}

export default ApiResponse;
