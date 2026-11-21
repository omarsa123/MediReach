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
  })  : _remoteDataSource = remoteDataSource ?? AuthRemoteDataSourceImpl(),
        _tokenStorage = tokenStorage ?? TokenStorage();

  /// Login with email and password, with role validation
  Future<UserModel> login({
    required String email,
    required String password,
    String? expectedRole,
  }) async {
    final response = await _remoteDataSource.login(email.trim(), password);

    if (!response.success || response.user == null) {
      throw ApiException(message: response.message.isNotEmpty ? response.message : 'Login failed');
    }

    final user = response.user!;

    // Role mapping: doctor -> provider
    final normalizedExpected = (expectedRole == 'doctor' ? 'provider' : expectedRole)?.toLowerCase();
    final normalizedActual = (user.role == 'doctor' ? 'provider' : user.role).toLowerCase();

    if (normalizedExpected != null && normalizedExpected.isNotEmpty) {
      if (normalizedActual != normalizedExpected) {
        if (normalizedActual == 'provider' && normalizedExpected == 'patient') {
          throw const RoleMismatchException(
            message: 'This account is registered as a healthcare provider. Please sign in through the Doctor login screen.',
            expectedRole: 'patient',
            actualRole: 'provider',
          );
        } else if (normalizedActual == 'patient' && normalizedExpected == 'provider') {
          throw const RoleMismatchException(
            message: 'This account is registered as a patient. Please sign in through the Patient login screen.',
            expectedRole: 'provider',
            actualRole: 'patient',
          );
        } else {
          throw RoleMismatchException(
            message: 'Access denied: role mismatch. Expected $expectedRole but got ${user.role}.',
            expectedRole: expectedRole!,
            actualRole: user.role,
          );
        }
      }
    }

    // Persist tokens
    if (response.session != null) {
      await _tokenStorage.saveTokens(
        accessToken: response.session!.accessToken,
        refreshToken: response.session!.refreshToken,
        tokenType: response.session!.tokenType,
      );
    }

    // Persist user role and basic info
    await UserPreferences.saveRole(user.role);
    await UserPreferences.saveUserInfo(
      userId: user.userId,
      name: user.name,
      email: user.email,
    );

    return user;
  }

  /// Register patient
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
      if (username != null && username.isNotEmpty) 'username': username.trim(),
      if (address != null && address.isNotEmpty) 'address': address.trim(),
      if (bloodType != null && bloodType.isNotEmpty) 'bloodType': bloodType,
    };

    final response = await _remoteDataSource.register(payload);
    if (!response.success || response.user == null) {
      throw ApiException(message: response.message.isNotEmpty ? response.message : 'Registration failed');
    }

    final user = response.user!;

    if (response.session != null) {
      await _tokenStorage.saveTokens(
        accessToken: response.session!.accessToken,
        refreshToken: response.session!.refreshToken,
        tokenType: response.session!.tokenType,
      );
    }

    await UserPreferences.saveRole('patient');
    await UserPreferences.saveUserInfo(
      userId: user.userId,
      name: user.name,
      email: user.email,
    );

    return user;
  }

  /// Register doctor / provider
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
      if (username != null && username.isNotEmpty) 'username': username.trim(),
      if (address != null && address.isNotEmpty) 'address': address.trim(),
    };

    final response = await _remoteDataSource.register(payload);
    if (!response.success || response.user == null) {
      throw ApiException(message: response.message.isNotEmpty ? response.message : 'Registration failed');
    }

    final user = response.user!;

    if (response.session != null) {
      await _tokenStorage.saveTokens(
        accessToken: response.session!.accessToken,
        refreshToken: response.session!.refreshToken,
        tokenType: response.session!.tokenType,
      );
    }

    await UserPreferences.saveRole('provider');
    await UserPreferences.saveUserInfo(
      userId: user.userId,
      name: user.name,
      email: user.email,
    );

    return user;
  }

  /// Restore active session on app startup
  Future<UserModel?> restoreSession() async {
    final hasTokens = await _tokenStorage.hasTokens();
    if (!hasTokens) return null;

    final accessToken = await _tokenStorage.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) return null;

    try {
      final user = await _remoteDataSource.getMe(accessToken);
      await UserPreferences.saveRole(user.role);
      await UserPreferences.saveUserInfo(
        userId: user.userId,
        name: user.name,
        email: user.email,
      );
      return user;
    } on UnauthorizedException {
      // Access token might be expired, attempt to refresh
      try {
        final newSession = await refreshToken();
        if (newSession != null) {
          final user = await _remoteDataSource.getMe(newSession.accessToken);
          await UserPreferences.saveRole(user.role);
          await UserPreferences.saveUserInfo(
            userId: user.userId,
            name: user.name,
            email: user.email,
          );
          return user;
        }
      } catch (_) {
        await logout();
      }
    } catch (_) {
      // Network or other temporary error: do not clear tokens prematurely
    }
    return null;
  }

  /// Refresh session using stored refresh token
  Future<AuthSessionModel?> refreshToken() async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      return null;
    }

    final response = await _remoteDataSource.refresh(refreshToken);
    if (response.session != null) {
      await _tokenStorage.saveTokens(
        accessToken: response.session!.accessToken,
        refreshToken: response.session!.refreshToken,
        tokenType: response.session!.tokenType,
      );
      return response.session;
    }
    return null;
  }

  /// Logout and clear stored tokens & preferences
  Future<void> logout() async {
    try {
      final accessToken = await _tokenStorage.getAccessToken();
      await _remoteDataSource.logout(accessToken);
    } catch (_) {
      // Ignore network errors on logout to ensure local cleanup succeeds
    } finally {
      await _tokenStorage.clearTokens();
      await UserPreferences.clearUserInfo();
    }
  }

  /// Request password reset link
  Future<void> forgotPassword(String email) async {
    await _remoteDataSource.forgotPassword(email.trim());
  }

  /// Reset password using recovery token
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _remoteDataSource.resetPassword(token.trim(), newPassword);
  }

  /// Verify email with verification token
  Future<Map<String, dynamic>> verifyEmail(String token) async {
    return await _remoteDataSource.verifyEmail(token.trim());
  }

  /// Resend verification email
  Future<void> resendVerification(String email) async {
    await _remoteDataSource.resendVerification(email.trim());
  }

  /// Raw / legacy helper methods for backward compatibility
  Future<Map<String, dynamic>> loginLegacy(String email, String password) async {
    try {
      final user = await login(email: email, password: password);
      return {'user': user.toJson()};
    } on ApiException catch (e) {
      return {'error': e.message};
    }
  }

  Future<Map<String, dynamic>> registerLegacy(Map<String, dynamic> payload) async {
    try {
      final response = await _remoteDataSource.register(payload);
      return {'user': response.user?.toJson()};
    } on ApiException catch (e) {
      return {'error': e.message};
    }
  }
}
