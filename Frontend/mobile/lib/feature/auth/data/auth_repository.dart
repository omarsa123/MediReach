
import '../../../core/network/api_exceptions.dart';
import '../../../core/services/user_preferences.dart';
import '../../../core/storage/token_storage.dart';

import 'auth_remote_data_source.dart';
import 'models/auth_response_model.dart';
import 'models/auth_session_model.dart';
import 'models/user_model.dart';

class AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final TokenStorage _tokenStorage;

  // Share one refresh operation between concurrent calls.
  Future<AuthSessionModel?>? _refreshFuture;

  AuthRepository({
    AuthRemoteDataSource? remoteDataSource,
    TokenStorage? tokenStorage,
  }) : _remoteDataSource = remoteDataSource ?? AuthRemoteDataSourceImpl(),
       _tokenStorage = tokenStorage ?? TokenStorage();

  // ============================================================
  // Helpers
  // ============================================================

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

  void _validateAuthResponse(
    AuthResponseModel response,
    String defaultMessage,
  ) {
    if (!response.success || response.user == null) {
      throw ApiException(
        message: response.message.trim().isNotEmpty
            ? response.message
            : defaultMessage,
      );
    }
  }

  Future<void> _saveSession(AuthSessionModel session) async {
    final accessToken = session.accessToken.trim();

    if (accessToken.isEmpty) {
      throw ApiException(
        message: 'Invalid session: missing access token',
      );
    }

    await _tokenStorage.saveTokens(
      accessToken: accessToken,
      refreshToken: session.refreshToken.trim(),
      tokenType: session.tokenType.trim().isEmpty
          ? 'Bearer'
          : session.tokenType.trim(),
    );
  }

  Future<void> _saveUserInfo(UserModel user) async {
    await UserPreferences.saveRole(
      _normalizeRole(user.role),
    );

    await UserPreferences.saveUserInfo(
      userId: user.userId,
      name: user.name,
      email: user.email,
    );
  }

  /// Prevent using a previous user's session when the new
  /// authentication response does not contain tokens.
  Future<void> _saveOptionalSession(
    AuthSessionModel? session,
  ) async {
    if (session == null) {
      await _tokenStorage.clearTokens();
      return;
    }

    await _saveSession(session);
  }

  // ============================================================
  // Login
  // ============================================================

 Future<UserModel> login({
  required String email,
  required String password,
  String? expectedRole,
  bool rememberMe = false,
}) async {
  final response = await _remoteDataSource.login(
    email.trim(),
    password,
  );

  _validateAuthResponse(response, 'Login failed');

  final user = response.user!;

  final actualRole = _normalizeRole(user.role);

  final requiredRole = expectedRole == null
      ? null
      : _normalizeRole(expectedRole);

  if (requiredRole != null &&
      requiredRole.isNotEmpty &&
      actualRole != requiredRole) {
    if (actualRole == 'provider' && requiredRole == 'patient') {
      throw const RoleMismatchException(
        message:
            'This account is registered as a healthcare provider. '
            'Please sign in through the Doctor login screen.',
        expectedRole: 'patient',
        actualRole: 'provider',
      );
    }

    if (actualRole == 'patient' && requiredRole == 'provider') {
      throw const RoleMismatchException(
        message:
            'This account is registered as a patient. '
            'Please sign in through the Patient login screen.',
        expectedRole: 'provider',
        actualRole: 'patient',
      );
    }

    throw RoleMismatchException(
      message: 'Access denied: role mismatch.',
      expectedRole: requiredRole,
      actualRole: actualRole,
    );
  }

  await UserPreferences.saveRememberMe(rememberMe);

  await _saveOptionalSession(response.session);
  await _saveUserInfo(user);

  return user;
}

  // ============================================================
  // Registration
  // ============================================================

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

    return _register(payload);
  }

  Future<UserModel> registerDoctor({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String specialization,
    required String licenseNumber,
    String providerType = 'Doctor',
    String? username,
    String? address,
    String? profileImagePath,
  }) async {
    final payload = <String, dynamic>{
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
      'role': 'provider',
      'providerType': providerType,
      'specialization': specialization.trim(),
      'licenseNumber': licenseNumber.trim(),
      if (username != null && username.trim().isNotEmpty)
        'username': username.trim(),
      if (address != null && address.trim().isNotEmpty)
        'address': address.trim(),
    };

    // profileImagePath is retained for compatibility.
    // Image upload is not implemented in this method.

    return _register(payload);
  }

  Future<UserModel> _register(
    Map<String, dynamic> payload,
  ) async {
    final response = await _remoteDataSource.register(payload);

    _validateAuthResponse(response, 'Registration failed');

    final user = response.user!;

    // Registration may succeed without a session if email
    // verification is required.
    await _saveOptionalSession(response.session);
    await _saveUserInfo(user);

    return user;
  }

  // ============================================================
  // Session Management
  // ============================================================

  Future<UserModel?> restoreSession() async {
  try {
    final rememberMe = await UserPreferences.getRememberMe();
    if (!rememberMe) {
      await _tokenStorage.clearTokens();
      await UserPreferences.clearUserInfo();
      return null;
    }
    final accessToken = await _tokenStorage.getAccessToken();

    // Try current access token first.
    if (accessToken != null && accessToken.trim().isNotEmpty) {
      try {
        final user = await _remoteDataSource.getMe(accessToken);

        await _saveUserInfo(user);

        return user;
      } on UnauthorizedException {
        // Access token expired. Try refreshing.
      }
    }

    // Try refreshing the session.
    final newSession = await refreshToken();

    if (newSession == null) {
      await logout();
      return null;
    }

    try {
      final user = await _remoteDataSource.getMe(
        newSession.accessToken,
      );

      await _saveUserInfo(user);

      return user;
    } on UnauthorizedException {
      await logout();
      return null;
    }
  } on NetworkException {
    // Network failure does NOT mean the session is invalid.
    return await _getCachedUser();
  }
}
  // ============================================================
  // Token Refresh
  // ============================================================

  Future<AuthSessionModel?> refreshToken() {
    final currentFuture = _refreshFuture;

    if (currentFuture != null) {
      return currentFuture;
    }

    final future = _performRefresh();

    _refreshFuture = future;

    return future.whenComplete(() {
      if (identical(_refreshFuture, future)) {
        _refreshFuture = null;
      }
    });
  }

  Future<AuthSessionModel?> _performRefresh() async {
    final currentRefreshToken =
        await _tokenStorage.getRefreshToken();

    if (currentRefreshToken == null ||
        currentRefreshToken.trim().isEmpty) {
      return null;
    }

    try {
      final response = await _remoteDataSource.refresh(
        currentRefreshToken,
      );

      if (!response.success || response.session == null) {
        throw ApiException(
          message: response.message.trim().isNotEmpty
              ? response.message
              : 'Failed to refresh session',
        );
      }

      final newSession = response.session!;

      if (newSession.accessToken.trim().isEmpty) {
        throw ApiException(
          message: 'Invalid refresh response: missing access token',
        );
      }

      // Keep the previous refresh token if the server
      // does not return a rotated refresh token.
      final updatedSession = AuthSessionModel(
        accessToken: newSession.accessToken,
        refreshToken: newSession.refreshToken.trim().isNotEmpty
            ? newSession.refreshToken
            : currentRefreshToken,
        expiresIn: newSession.expiresIn,
        tokenType: newSession.tokenType.trim().isNotEmpty
            ? newSession.tokenType
            : 'Bearer',
      );

      await _saveSession(updatedSession);

      return updatedSession;
    } on UnauthorizedException {
      // Refresh token is invalid or expired.
      return null;
    }
  }

  // ============================================================
  // Logout
  // ============================================================

  Future<void> logout() async {
    try {
      final accessToken = await _tokenStorage.getAccessToken();

      await _remoteDataSource.logout(accessToken);
    } catch (_) {
      // Remote logout failure should not prevent local cleanup.
    } finally {
      try {
        await _tokenStorage.clearTokens();
      } finally {
        await UserPreferences.clearUserInfo();
      }
    }
  }
  Future<UserModel?> _getCachedUser() async {
  final cachedData = await UserPreferences.getUserInfo();

  final userId = cachedData['userId'];
  final name = cachedData['name'];
  final email = cachedData['email'];
  final role = cachedData['role'];

  if (userId == null ||
      userId.isEmpty ||
      role == null ||
      role.isEmpty) {
    return null;
  }

  return UserModel(
    userId: userId,
    name: name ?? '',
    username: '',
    email: email ?? '',
    phone: '',
    role: _normalizeRole(role),
  );
}

  // ============================================================
  // Email Verification
  // ============================================================

  Future<void> verifyEmail({
    required String email,
    required String otp,
  }) async {
    await _remoteDataSource.verifyEmail(
      email: email.trim(),
      otp: otp.trim(),
    );
  }

  Future<void> resendVerification(String email) async {
    await _remoteDataSource.resendVerification(
      email.trim(),
    );
  }

  // ============================================================
  // Google OAuth
  // ============================================================

  Future<String> getGoogleAuthUrl() {
    return _remoteDataSource.getGoogleAuthUrl();
  }

  // ============================================================
  // Password Recovery
  // ============================================================

 
Future<void> forgotPassword(String email) async {
  await _remoteDataSource.forgotPassword(email.trim());
}

Future<void> verifyResetOtp({
  required String email,
  required String otp,
}) async {
  await _remoteDataSource.verifyResetOtp(
    email: email.trim(),
    otp: otp.trim(),
  );
}
Future<UserModel> completeGoogleLogin({
  required String accessToken,
  required String refreshToken,
  required String expectedRole,
  bool rememberMe = false,
}) async {
  final response = await _remoteDataSource.googleCallback(
    accessToken,
    refreshToken,
    expectedRole: _normalizeRole(expectedRole),
  );

  _validateAuthResponse(response, 'Google login failed');

  final user = response.user!;
  final actualRole = _normalizeRole(user.role);
  final requiredRole = _normalizeRole(expectedRole);

  if (actualRole != requiredRole) {
    if (actualRole == 'provider' && requiredRole == 'patient') {
      throw const RoleMismatchException(
        message:
            'This account is registered as a healthcare provider. '
            'Please sign in through the Doctor login screen.',
        expectedRole: 'patient',
        actualRole: 'provider',
      );
    }

    if (actualRole == 'patient' && requiredRole == 'provider') {
      throw const RoleMismatchException(
        message:
            'This account is registered as a patient. '
            'Please sign in through the Patient login screen.',
        expectedRole: 'provider',
        actualRole: 'patient',
      );
    }

    throw RoleMismatchException(
      message: 'Access denied: role mismatch.',
      expectedRole: requiredRole,
      actualRole: actualRole,
    );
  }

  await UserPreferences.saveRememberMe(rememberMe);
  await _saveOptionalSession(response.session);
  await _saveUserInfo(user);

  return user;
}

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

  Future<Map<String, dynamic>> loginLegacy(
    String email,
    String password,
  ) async {
    try {
      final user = await login(
        email: email,
        password: password,
      );

      return {'user': user.toJson()};
    } on ApiException catch (e) {
      return {'error': e.message};
    }
  }

  Future<Map<String, dynamic>> registerLegacy(
    Map<String, dynamic> payload,
  ) async {
    try {
      final user = await _register(payload);

      return {'user': user.toJson()};
    } on ApiException catch (e) {
      return {'error': e.message};
    }
  }
}
