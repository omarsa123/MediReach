import '../../../core/network/api_client.dart';
import 'models/auth_response_model.dart';
import 'models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthResponseModel> register(Map<String, dynamic> payload);
  Future<AuthResponseModel> login(String email, String password);
  Future<AuthResponseModel> refresh(String refreshToken);
  Future<Map<String, dynamic>> logout([String? accessToken]);
  Future<Map<String, dynamic>> forgotPassword(String email);
  Future<Map<String, dynamic>> resetPassword(String token, String newPassword);
  Future<Map<String, dynamic>> verifyEmail(String token);
  Future<Map<String, dynamic>> resendVerification(String email);
  Future<UserModel> getMe(String accessToken);
  Future<UserModel> updateMe(String accessToken, Map<String, dynamic> data);
  Future<String> getGoogleAuthUrl();
  Future<AuthResponseModel> googleCallback(String accessToken, String refreshToken);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSourceImpl({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  @override
  Future<AuthResponseModel> register(Map<String, dynamic> payload) async {
    final response = await _apiClient.post(
      '/api/auth/register',
      body: payload,
    );
    return AuthResponseModel.fromJson(response as Map<String, dynamic>);
  }

  @override
  Future<AuthResponseModel> login(String email, String password) async {
    final response = await _apiClient.post(
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
    return AuthResponseModel.fromJson(response as Map<String, dynamic>);
  }

  @override
  Future<AuthResponseModel> refresh(String refreshToken) async {
    final response = await _apiClient.post(
      '/api/auth/refresh',
      body: {'refreshToken': refreshToken},
    );
    return AuthResponseModel.fromJson(response as Map<String, dynamic>);
  }

  @override
  Future<Map<String, dynamic>> logout([String? accessToken]) async {
    final response = await _apiClient.post(
      '/api/auth/logout',
      token: accessToken,
    );
    return response as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final response = await _apiClient.post(
      '/api/auth/forget-password',
      body: {'email': email},
    );
    return response as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> resetPassword(String token, String newPassword) async {
    final response = await _apiClient.post(
      '/api/auth/reset-password',
      body: {
        'token': token,
        'password': newPassword,
      },
    );
    return response as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> verifyEmail(String token) async {
    final response = await _apiClient.post(
      '/api/auth/verify-email',
      body: {'token': token},
    );
    return response as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> resendVerification(String email) async {
    final response = await _apiClient.post(
      '/api/auth/resend-verification',
      body: {'email': email},
    );
    return response as Map<String, dynamic>;
  }

  @override
  Future<UserModel> getMe(String accessToken) async {
    final response = await _apiClient.get(
      '/api/auth/me',
      token: accessToken,
    );
    final data = response['data'] ?? response;
    final userData = data['user'] ?? data;
    return UserModel.fromJson(userData as Map<String, dynamic>);
  }

  @override
  Future<UserModel> updateMe(String accessToken, Map<String, dynamic> data) async {
    final response = await _apiClient.patch(
      '/api/auth/me',
      token: accessToken,
      body: data,
    );
    final resData = response['data'] ?? response;
    final userData = resData['user'] ?? resData;
    return UserModel.fromJson(userData as Map<String, dynamic>);
  }

  @override
  Future<String> getGoogleAuthUrl() async {
    final response = await _apiClient.get('/api/auth/google-url');
    final data = response['data'] ?? response;
    return (data['url'] ?? '').toString();
  }

  @override
  Future<AuthResponseModel> googleCallback(String accessToken, String refreshToken) async {
    final response = await _apiClient.post(
      '/api/auth/google/callback',
      body: {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
      },
    );
    return AuthResponseModel.fromJson(response as Map<String, dynamic>);
  }
}
