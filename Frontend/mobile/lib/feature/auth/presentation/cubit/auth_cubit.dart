import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:medireach/feature/auth/data/models/user_model.dart';
import '../../../../core/network/api_exceptions.dart';
import '../../../../feature/auth/data/auth_repository.dart';
import 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  final AuthRepository _repo;

  AuthCubit(this._repo) : super(AuthInitial());

  /// Check whether an authenticated session exists (used by SplashView)
  Future<void> restoreSession() async {
    try {
      final user = await _repo.restoreSession();
      if (user != null) {
        emit(AuthAuthenticated(user));
      } else {
        emit(const AuthUnauthenticated());
      }
    } catch (_) {
      emit(const AuthUnauthenticated());
    }
  }

  /// Get Google Auth URL
  Future<String?> getGoogleAuthUrl() async {
    try {
      return await _repo.getGoogleAuthUrl();
    } catch (_) {
      return null;
    }
  }

  /// Login with role validation
  Future<void> loginUser({
  required String email,
  required String password,
  String? expectedRole,
  bool rememberMe = false,
}) async {
  emit(const AuthLoading(message: 'Signing in...'));

  try {
    final user = await _repo.login(
      email: email,
      password: password,
      expectedRole: expectedRole,
      rememberMe: rememberMe,
    );

    if (user.status.toLowerCase() == 'pending') {
      emit(
        AuthEmailNotVerified(
          email: user.email,
          message: 'Your account is pending approval by the administrator.',
        ),
      );
      return;
    }

    emit(AuthAuthenticated(user, message: 'Welcome back, ${user.name}!'));
  } on EmailNotVerifiedException catch (e) {
    emit(
      AuthEmailNotVerified(
        email: e.email.isNotEmpty ? e.email : email.trim(),
        message: e.message,
      ),
    );
  } on RoleMismatchException catch (e) {
    emit(AuthError(e.message, code: 'ROLE_MISMATCH'));
  } on NetworkException catch (e) {
    emit(AuthError(e.message, code: 'NETWORK_ERROR'));
  } on ApiException catch (e) {
    emit(
      AuthError(
        e.message,
        code: e.code,
        email: e.data?['email']?.toString(),
      ),
    );
  } catch (e) {
    emit(const AuthError('Login failed. Please try again.'));
  }
}

  /// Patient Registration
  Future<void> registerPatient({
    required String name,
    required String email,
    required String phone,
    required String password,
    String? username,
    String? address,
    String? bloodType,
  }) async {
    emit(const AuthLoading(message: 'Creating patient account...'));
    try {
      final user = await _repo.registerPatient(
        name: name,
        email: email,
        phone: phone,
        password: password,
        username: username,
        address: address,
        bloodType: bloodType,
      );
      emit(AuthRegistrationSuccess(user: user, email: email));
    } on NetworkException catch (e) {
      emit(AuthError(e.message, code: 'NETWORK_ERROR'));
    } on ApiException catch (e) {
      emit(AuthError(e.message, code: e.code));
    } catch (e) {
      emit(const AuthError('Registration failed. Please try again.'));
    }
  }

  /// Provider Registration (Doctor / Nurse)
  Future<void> registerDoctor({
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
    emit(const AuthLoading(message: 'Creating provider account...'));
    try {
      final user = await _repo.registerDoctor(
        name: name,
        email: email,
        phone: phone,
        password: password,
        specialization: specialization,
        licenseNumber: licenseNumber,
        providerType: providerType,
        username: username,
        address: address,
        profileImagePath: profileImagePath,
      );
      emit(AuthRegistrationSuccess(user: user, email: email));
    } on NetworkException catch (e) {
      emit(AuthError(e.message, code: 'NETWORK_ERROR'));
    } on ApiException catch (e) {
      emit(AuthError(e.message, code: e.code));
    } catch (e) {
      emit(const AuthError('Registration failed. Please try again.'));
    }
  }

  /// Verify Email with email & OTP
  Future<void> verifyEmail({required String email, required String otp}) async {
    emit(const AuthLoading(message: 'Verifying email...'));
    try {
      await _repo.verifyEmail(email: email, otp: otp);
      emit(const AuthEmailVerificationSuccess('Email verified successfully!'));
    } on NetworkException catch (e) {
      emit(AuthError(e.message, code: 'NETWORK_ERROR'));
    } on ApiException catch (e) {
      emit(AuthError(e.message, code: e.code));
    } catch (e) {
      emit(const AuthError('Verification failed. Please try again.'));
    }
  }

  /// Resend Verification Email
  Future<void> resendVerification(String email) async {
    emit(const AuthLoading(message: 'Sending verification email...'));
    try {
      await _repo.resendVerification(email);
      emit(
        AuthEmailResent(
          email: email,
          message: 'A verification code has been sent to $email.',
        ),
      );
    } on NetworkException catch (e) {
      emit(AuthError(e.message, code: 'NETWORK_ERROR'));
    } on ApiException catch (e) {
      emit(AuthError(e.message, code: e.code));
    } catch (e) {
      emit(const AuthError('Failed to send email. Please try again.'));
    }
  }

  /// Forgot Password
  Future<void> forgotPassword(String email) async {
    emit(const AuthLoading(message: 'Sending reset instructions...'));
    try {
      await _repo.forgotPassword(email);
      emit(
        AuthPasswordResetEmailSent(
          email: email,
          message: 'Password reset code sent! Please check your inbox.',
        ),
      );
    } on NetworkException catch (e) {
      emit(AuthError(e.message, code: 'NETWORK_ERROR'));
    } on ApiException catch (e) {
      emit(AuthError(e.message, code: e.code));
    } catch (e) {
      emit(const AuthError('Failed to send reset email. Please try again.'));
    }
  }

  /// Verify password reset OTP.
/// Verify password reset OTP.
Future<void> verifyResetOtp({
  required String email,
  required String otp,
}) async {
  emit(const AuthLoading(message: 'Verifying code...'));

  try {
    await _repo.verifyResetOtp(
      email: email,
      otp: otp,
    );

    emit(
      AuthResetOtpVerified(
        email: email.trim(),
      ),
    );
  } on NetworkException catch (e) {
    emit(AuthError(e.message, code: 'NETWORK_ERROR'));
  } on ApiException catch (e) {
    emit(AuthError(e.message, code: e.code));
  } catch (e) {
    emit(
      const AuthError('OTP verification failed. Please try again.'),
    );
  }
}

/// Reset password using email and OTP.
Future<void> resetPassword({
  required String email,
  required String otp,
  required String newPassword,
}) async {
  emit(const AuthLoading(message: 'Resetting password...'));

  try {
    await _repo.resetPassword(
      email: email,
      otp: otp,
      newPassword: newPassword,
    );

    emit(
      const AuthPasswordResetSuccess(
        'Password reset successfully! Please sign in.',
      ),
    );
  } on NetworkException catch (e) {
    emit(AuthError(e.message, code: 'NETWORK_ERROR'));
  } on ApiException catch (e) {
    emit(AuthError(e.message, code: e.code));
  } catch (e) {
    emit(
      const AuthError('Password reset failed. Please try again.'),
    );
  }
}
Future<UserModel?> completeGoogleLogin({
  required String accessToken,
  required String refreshToken,
  required String expectedRole,
  bool rememberMe = false,
}) async {
  emit(const AuthLoading(message: 'Completing Google sign-in...'));

  try {
    final user = await _repo.completeGoogleLogin(
      accessToken: accessToken,
      refreshToken: refreshToken,
      expectedRole: expectedRole,
      rememberMe: rememberMe,
    );

    emit(AuthAuthenticated(user, message: 'Welcome, ${user.name}!'));

    return user;
  } on RoleMismatchException catch (e) {
    emit(AuthError(e.message, code: 'ROLE_MISMATCH'));
  } on NetworkException catch (e) {
    emit(AuthError(e.message, code: 'NETWORK_ERROR'));
  } on ApiException catch (e) {
    emit(AuthError(e.message, code: e.code));
  } catch (e) {
    emit(const AuthError('Google sign-in failed. Please try again.'));
  }

  return null;
}
  /// Logout
  Future<void> logout() async {
    emit(const AuthLoading(message: 'Signing out...'));
    try {
      await _repo.logout();
      emit(const AuthUnauthenticated(message: 'Signed out successfully.'));
    } catch (e) {
      emit(AuthError('Logout error: ${e.toString()}'));
    }
  }

  /// Reset error state back to initial
  void clearError() {
    if (state is AuthError) {
      emit(AuthInitial());
    }
  }

  // --- Legacy Compatibility Overloads ---
  Future<void> login(String email, String password) async {
    await loginUser(email: email, password: password);
  }

  Future<void> register(Map<String, dynamic> payload) async {
    final role = payload['role']?.toString();
    if (role == 'provider' || role == 'doctor') {
      await registerDoctor(
        name: payload['name']?.toString() ?? '',
        email: payload['email']?.toString() ?? '',
        phone: payload['phone']?.toString() ?? '',
        password: payload['password']?.toString() ?? '',
        specialization:
            payload['specialization']?.toString() ?? 'General Practitioner',
        licenseNumber: payload['licenseNumber']?.toString() ?? '',
        providerType: payload['providerType']?.toString() ?? 'Doctor',
      );
    } else {
      await registerPatient(
        name: payload['name']?.toString() ?? '',
        email: payload['email']?.toString() ?? '',
        phone: payload['phone']?.toString() ?? '',
        password: payload['password']?.toString() ?? '',
        bloodType: payload['bloodType']?.toString(),
      );
    }
  }
}

