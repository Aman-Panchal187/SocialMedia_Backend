class ApiResponse {
  constructor(res, statusCode, data = null, message = undefined) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  }
}

export default ApiResponse;
