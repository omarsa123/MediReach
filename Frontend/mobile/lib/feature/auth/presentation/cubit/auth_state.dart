import 'package:equatable/equatable.dart';
import '../../data/models/user_model.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {
  final String? message;
  const AuthLoading({this.message});

  @override
  List<Object?> get props => [message];
}

class AuthAuthenticated extends AuthState {
  final UserModel user;
  final String? message;

  const AuthAuthenticated(this.user, {this.message});

  @override
  List<Object?> get props => [user, message];
}

class AuthUnauthenticated extends AuthState {
  final String? message;
  const AuthUnauthenticated({this.message});

  @override
  List<Object?> get props => [message];
}

class AuthError extends AuthState {
  final String message;
  final String? code;
  final String? email;

  const AuthError(this.message, {this.code, this.email});

  @override
  List<Object?> get props => [message, code, email];
}

/// الحساب محتاج تفعيل إيميل قبل الدخول
class AuthEmailNotVerified extends AuthState {
  final String email;
  final String message;

  const AuthEmailNotVerified({
    required this.email,
    this.message = 'Please verify your email before signing in.',
  });

  @override
  List<Object?> get props => [email, message];
}

class AuthRegistrationSuccess extends AuthState {
  final UserModel user;
  final String email;

  const AuthRegistrationSuccess({
    required this.user,
    required this.email,
  });

  @override
  List<Object?> get props => [user, email];
}

class AuthEmailVerificationSuccess extends AuthState {
  final String message;
  const AuthEmailVerificationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}
class AuthNetworkError extends AuthState {
  const AuthNetworkError();
}

class AuthEmailResent extends AuthState {
  final String email;
  final String message;

  const AuthEmailResent({
    required this.email,
    this.message = 'Verification email resent successfully.',
  });

  @override
  List<Object?> get props => [email, message];
}

class AuthPasswordResetEmailSent extends AuthState {
  final String email;
  final String message;

  const AuthPasswordResetEmailSent({
    required this.email,
    required this.message,
  });

  @override
  List<Object?> get props => [email, message];
}

class AuthPasswordResetSuccess extends AuthState {
  final String message;

  const AuthPasswordResetSuccess(this.message);

  @override
  List<Object?> get props => [message];
}
class AuthResetOtpVerified extends AuthState {
  final String email;

  const AuthResetOtpVerified({
    required this.email,
  });

  @override
  List<Object?> get props => [email];
}