import '../../../core/network/api_client.dart';
import 'models/auth_response_model.dart';
import 'models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthResponseModel> register(Map<String, dynamic> payload);

  Future<AuthResponseModel> login(String email, String password);

  Future<AuthResponseModel> refresh(String refreshToken);

  Future<void> logout([String? accessToken]);

  Future<void> forgotPassword(String email);

  Future<void> verifyResetOtp({required String email, required String otp});

  Future<void> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  });

  Future<void> verifyEmail({required String email, required String otp});

  Future<void> resendVerification(String email);

  Future<UserModel> getMe(String accessToken);

  Future<UserModel> updateMe(String accessToken, Map<String, dynamic> data);

  Future<String> getGoogleAuthUrl({required String role});

  Future<AuthResponseModel> registerWithGoogle(Map<String, dynamic> payload);

  Future<AuthResponseModel> googleCallback({
    String? accessToken,
    String? refreshToken,
    String? code,
    required String expectedRole,
  });
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSourceImpl({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient();

  /// Safely convert API response to Map.
  Map<String, dynamic> _toMap(dynamic response) {
    if (response is Map<String, dynamic>) {
      return response;
    }

    if (response is Map) {
      return Map<String, dynamic>.from(response);
    }

    throw const FormatException('Invalid response format from server');
  }

  /// Extract nested data from API response.
  Map<String, dynamic> _extractData(dynamic response) {
    final map = _toMap(response);
    final data = map['data'];

    if (data is Map<String, dynamic>) {
      return data;
    }

    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }

    return map;
  }

  /// Register a new user.
  @override
  Future<AuthResponseModel> register(Map<String, dynamic> payload) async {
    final response = await _apiClient.post(
      '/api/v1/auth/register',
      body: payload,
    );

    return AuthResponseModel.fromJson(_toMap(response));
  }

  /// Login with email and password.
  @override
  Future<AuthResponseModel> login(String email, String password) async {
    final response = await _apiClient.post(
      '/api/v1/auth/login',
      body: {'email': email.trim(), 'password': password},
    );

    return AuthResponseModel.fromJson(_toMap(response));
  }

  /// Refresh authentication tokens.
  @override
  Future<AuthResponseModel> refresh(String refreshToken) async {
    final response = await _apiClient.post(
      '/api/v1/auth/refresh',
      body: {'refreshToken': refreshToken},
    );

    return AuthResponseModel.fromJson(_toMap(response));
  }

  /// Logout current user.
  @override
  Future<void> logout([String? accessToken]) async {
    await _apiClient.post('/api/v1/auth/logout', token: accessToken);
  }

  /// Request password recovery email.
  @override
  Future<void> forgotPassword(String email) async {
    await _apiClient.post(
      '/api/v1/auth/forgot-password',
      body: {'email': email.trim()},
    );
  }

  /// Verify password reset OTP.
  @override
  Future<void> verifyResetOtp({
    required String email,
    required String otp,
  }) async {
    await _apiClient.post(
      '/api/v1/auth/verify-reset-otp',
      body: {'email': email.trim(), 'otp': otp.trim()},
    );
  }

  /// Reset user password using email and verified OTP.
  @override
  Future<void> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    await _apiClient.post(
      '/api/v1/auth/reset-password',
      body: {
        'email': email.trim(),
        'otp': otp.trim(),
        'newPassword': newPassword,
      },
    );
  }

  /// Verify email using OTP.
  @override
  Future<void> verifyEmail({required String email, required String otp}) async {
    await _apiClient.post(
      '/api/v1/auth/verify-email',
      body: {'email': email.trim(), 'otp': otp.trim()},
    );
  }

  /// Resend email verification.
  @override
  Future<void> resendVerification(String email) async {
    await _apiClient.post(
      '/api/v1/auth/resend-verification',
      body: {'email': email.trim()},
    );
  }

  /// Get current authenticated user.
  @override
  Future<UserModel> getMe(String accessToken) async {
    final response = await _apiClient.get(
      '/api/v1/auth/me',
      token: accessToken,
    );

    final data = _extractData(response);

    final userData = data['user'] ?? data;

    if (userData is! Map) {
      throw const FormatException('Invalid user data received from server');
    }

    return UserModel.fromJson(Map<String, dynamic>.from(userData));
  }

  /// Update current user profile.
  @override
  Future<UserModel> updateMe(
    String accessToken,
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.patch(
      '/api/v1/auth/me',
      token: accessToken,
      body: data,
    );

    final responseData = _extractData(response);

    final userData = responseData['user'] ?? responseData;

    if (userData is! Map) {
      throw const FormatException(
        'Invalid updated user data received from server',
      );
    }

    return UserModel.fromJson(Map<String, dynamic>.from(userData));
  }

  /// Get Google OAuth authorization URL.
  @override
  Future<String> getGoogleAuthUrl({required String role}) async {
    final response = await _apiClient.get(
      '/api/v1/auth/google/url',
      queryParameters: {'role': role},
    );

    if (response is Map && response['data'] is String) {
      return response['data'].toString();
    }
    final data = _extractData(response);
    return data['url'].toString();
  }

  /// Complete Google OAuth callback.
  /// Register a new user using Google authentication.
  @override
  Future<AuthResponseModel> registerWithGoogle(
    Map<String, dynamic> payload,
  ) async {
    final response = await _apiClient.post(
      '/api/v1/auth/google/register',
      body: payload,
    );

    return AuthResponseModel.fromJson(_toMap(response));
  }

  Future<AuthResponseModel> googleCallback({
    String? accessToken,
    String? refreshToken,
    String? code,
    required String expectedRole,
  }) async {
    final body = <String, dynamic>{'expectedRole': expectedRole};
    if (accessToken != null && accessToken.isNotEmpty) {
      body['accessToken'] = accessToken;
    }
    if (refreshToken != null && refreshToken.isNotEmpty) {
      body['refreshToken'] = refreshToken;
    }
    if (code != null && code.isNotEmpty) {
      body['code'] = code;
    }

    final response = await _apiClient.post(
      '/api/v1/auth/google/callback',
      body: body,
    );

    return AuthResponseModel.fromJson(_toMap(response));
  }
}
