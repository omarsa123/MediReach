class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? code;
  /// بيانات إضافية من السيرفر (مثل email في EMAIL_NOT_VERIFIED)
  final Map<String, dynamic>? data;

  const ApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.data,
  });

  @override
  String toString() => message;
}

class NetworkException extends ApiException {
  const NetworkException({
    super.message =
        'No internet connection. Please check your network and try again.',
  }) : super(statusCode: null, code: 'NETWORK_ERROR');
}

class UnauthorizedException extends ApiException {
  const UnauthorizedException({
    super.message = 'Unauthorized. Please sign in again.',
  }) : super(statusCode: 401, code: 'UNAUTHORIZED');
}

class RoleMismatchException extends ApiException {
  final String expectedRole;
  final String actualRole;

  const RoleMismatchException({
    required super.message,
    required this.expectedRole,
    required this.actualRole,
  }) : super(statusCode: 403, code: 'ROLE_MISMATCH');
}

/// الحساب موجود بس الإيميل لسه متفعّلش
class EmailNotVerifiedException extends ApiException {
  final String email;

  const EmailNotVerifiedException({
    required this.email,
    super.message =
        'Please verify your email before signing in.',
  }) : super(statusCode: 403, code: 'EMAIL_NOT_VERIFIED');
}
