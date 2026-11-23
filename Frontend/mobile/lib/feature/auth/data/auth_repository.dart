import '../../../core/network/api_exceptions.dart';
import '../../../core/services/user_preferences.dart';
import '../../../core/storage/token_storage.dart';

import 'auth_remote_data_source.dart';
import 'models/auth_session_model.dart';
import 'models/user_model.dart';

class AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final TokenStorage _tokenStorage;

  AuthRepository({
    AuthRemoteDataSource? remoteDataSource,
    TokenStorage? tokenStorage,
    String? baseUrl,
  }) : _remoteDataSource = remoteDataSource ?? AuthRemoteDataSourceImpl(),
       _tokenStorage = tokenStorage ?? TokenStorage();

  // ============================================================
  // Helpers
  // ============================================================

  /// Normalize user roles.
  String _normalizeRole(String role) {
    final normalized = role.trim().toLowerCase();

    switch (normalized) {
      case 'doctor':
        return 'provider';

      case 'organizer':
        return 'organization';

      default:
        return normalized;
    }
  }

  /// Save authentication tokens.
  Future<void> _saveSession(AuthSessionModel session) async {
    await _tokenStorage.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      tokenType: session.tokenType,
    );
  }

  /// Save user information locally.
  Future<void> _saveUserInfo(UserModel user) async {
    await UserPreferences.saveRole(_normalizeRole(user.role));

    await UserPreferences.saveUserInfo(
      userId: user.userId,
      name: user.name,
      email: user.email,
    );
  }

  /// Validate API authentication response.
  void _validateAuthResponse(dynamic response, String defaultMessage) {
    if (!response.success || response.user == null) {
      throw ApiException(
        message: response.message.isNotEmpty
            ? response.message
            : defaultMessage,
      );
    }
  }

  // ============================================================
  // Login
  // ============================================================

  /// Login with email and password.
  Future<UserModel> login({
    required String email,
    required String password,
    String? expectedRole,
  }) async {
    final response = await _remoteDataSource.login(email.trim(), password);

    _validateAuthResponse(response, 'Login failed');

    final user = response.user!;

    final normalizedActual = _normalizeRole(user.role);

    final normalizedExpected = expectedRole == null
        ? null
        : _normalizeRole(expectedRole);

    // Validate expected account role.
    if (normalizedExpected != null &&
        normalizedExpected.isNotEmpty &&
        normalizedActual != normalizedExpected) {
      if (normalizedActual == 'provider' && normalizedExpected == 'patient') {
        throw const RoleMismatchException(
          message:
              'This account is registered as a healthcare provider. '
              'Please sign in through the Doctor login screen.',
          expectedRole: 'patient',
          actualRole: 'provider',
        );
      }

      if (normalizedActual == 'patient' && normalizedExpected == 'provider') {
        throw const RoleMismatchException(
          message:
              'This account is registered as a patient. '
              'Please sign in through the Patient login screen.',
          expectedRole: 'provider',
          actualRole: 'patient',
        );
      }

      throw RoleMismatchException(
        message:
            'Access denied: role mismatch. '
            'Expected $normalizedExpected but got $normalizedActual.',
        expectedRole: normalizedExpected,
        actualRole: normalizedActual,
      );
    }

    // Save session only after role validation.
    if (response.session != null) {
      await _saveSession(response.session!);
    }

    await _saveUserInfo(user);

    return user;
  }

  // ============================================================
  // Registration
  // ============================================================

  /// Register a new patient.
  Future<UserModel> registerPatient({
    required String name,
    required String email,
    required String phone,
    required String password,
    String? username,
    String? address,
    String? bloodType,
  }) async {
    final payload = <String, dynamic>{
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
      'role': 'patient',
      if (username != null && username.trim().isNotEmpty)
        'username': username.trim(),
      if (address != null && address.trim().isNotEmpty)
        'address': address.trim(),
      if (bloodType != null && bloodType.trim().isNotEmpty)
        'bloodType': bloodType.trim(),
    };

    final response = await _remoteDataSource.register(payload);

    _validateAuthResponse(response, 'Registration failed');

    final user = response.user!;

    if (response.session != null) {
      await _saveSession(response.session!);
    }

    await _saveUserInfo(user);

    return user;
  }

  /// Register a new doctor / healthcare provider.
  Future<UserModel> registerDoctor({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String specialization,
    required String licenseNumber,
    String? username,
    String? address,
  }) async {
    final payload = <String, dynamic>{
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
      'role': 'provider',
      'providerType': 'Doctor',
      'specialization': specialization.trim(),
      'licenseNumber': licenseNumber.trim(),
      if (username != null && username.trim().isNotEmpty)
        'username': username.trim(),
      if (address != null && address.trim().isNotEmpty)
        'address': address.trim(),
    };

    final response = await _remoteDataSource.register(payload);

    _validateAuthResponse(response, 'Registration failed');

    final user = response.user!;

    if (response.session != null) {
      await _saveSession(response.session!);
    }

    await _saveUserInfo(user);

    return user;
  }

  // ============================================================
  // Session Management
  // ============================================================

  /// Restore active session when application starts.
  Future<UserModel?> restoreSession() async {
    final hasTokens = await _tokenStorage.hasTokens();

    if (!hasTokens) return null;

    final accessToken = await _tokenStorage.getAccessToken();

    if (accessToken == null || accessToken.isEmpty) {
      return null;
    }

    try {
      final user = await _remoteDataSource.getMe(accessToken);

      await _saveUserInfo(user);

      return user;
    } on UnauthorizedException {
      // Access token may have expired.
      try {
        final newSession = await refreshToken();

        if (newSession == null) {
          await logout();
          return null;
        }

        final user = await _remoteDataSource.getMe(newSession.accessToken);

        await _saveUserInfo(user);

        return user;
      } catch (_) {
        await logout();
        return null;
      }
    } catch (_) {
      // Preserve tokens on temporary network errors.
      return null;
    }
  }

  /// Refresh authentication session.
  Future<AuthSessionModel?> refreshToken() async {
    final storedRefreshToken = await _tokenStorage.getRefreshToken();

    if (storedRefreshToken == null || storedRefreshToken.isEmpty) {
      return null;
    }

    final response = await _remoteDataSource.refresh(storedRefreshToken);

    if (!response.success || response.session == null) {
      return null;
    }

    await _saveSession(response.session!);

    return response.session;
  }

  /// Logout and clear local session.
  Future<void> logout() async {
    try {
      final accessToken = await _tokenStorage.getAccessToken();

      await _remoteDataSource.logout(accessToken);
    } catch (_) {
      // Local cleanup must always happen.
    } finally {
      await _tokenStorage.clearTokens();
      await UserPreferences.clearUserInfo();
    }
  }

  // ============================================================
  // Email Verification
  // ============================================================

  /// Verify email using OTP.
  Future<void> verifyEmail({required String email, required String otp}) async {
    await _remoteDataSource.verifyEmail(email: email.trim(), otp: otp.trim());
  }

  /// Resend verification email.
  Future<void> resendVerification(String email) async {
    await _remoteDataSource.resendVerification(email.trim());
  }

  // ============================================================
  // Google OAuth
  // ============================================================

  Future<String> getGoogleAuthUrl() => _remoteDataSource.getGoogleAuthUrl();

  // ============================================================
  // Password Recovery
  // ============================================================

  /// Request password recovery email.
  Future<void> forgotPassword(String email) async {
    await _remoteDataSource.forgotPassword(email.trim());
  }

  /// Reset password using email and OTP.
  Future<void> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    await _remoteDataSource.resetPassword(
      email: email.trim(),
      otp: otp.trim(),
      newPassword: newPassword,
    );
  }

  // ============================================================
  // Legacy Compatibility
  // ============================================================

  /// Legacy login helper.
  Future<Map<String, dynamic>> loginLegacy(
    String email,
    String password,
  ) async {
    try {
      final user = await login(email: email, password: password);

      return {'user': user.toJson()};
    } on ApiException catch (e) {
      return {'error': e.message};
    }
  }

  /// Legacy registration helper.
  Future<Map<String, dynamic>> registerLegacy(
    Map<String, dynamic> payload,
  ) async {
    try {
      final response = await _remoteDataSource.register(payload);

      _validateAuthResponse(response, 'Registration failed');

      return {'user': response.user!.toJson()};
    } on ApiException catch (e) {
      return {'error': e.message};
    }
  }
}
