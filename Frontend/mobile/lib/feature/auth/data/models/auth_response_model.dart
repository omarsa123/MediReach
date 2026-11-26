import 'package:equatable/equatable.dart';
import '../../../../feature/auth/data/models/auth_session_model.dart';
import 'user_model.dart';

class AuthResponseModel extends Equatable {
  final bool success;
  final String message;
  final UserModel? user;
  final AuthSessionModel? session;
  final bool requiresRegistration;
  final bool requiresApproval;
  final String? registrationToken;
  final String? googleEmail;
  final String? googleName;

  const AuthResponseModel({
    required this.success,
    required this.message,
    this.user,
    this.session,
    this.requiresRegistration = false,
    this.requiresApproval = false,
    this.registrationToken,
    this.googleEmail,
    this.googleName,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map
        ? Map<String, dynamic>.from(json['data'] as Map)
        : json;
    final userData = data['user'] ?? json['user'];
    final sessionData = data['session'] ?? json['session'];
    final googleUser = data['googleUser'] is Map
        ? Map<String, dynamic>.from(data['googleUser'] as Map)
        : <String, dynamic>{};

    return AuthResponseModel(
      success: json['success'] == true,
      message: (json['message'] ?? 'Success').toString(),
      user: userData is Map
          ? UserModel.fromJson(Map<String, dynamic>.from(userData))
          : null,
      session: sessionData is Map
          ? AuthSessionModel.fromJson(Map<String, dynamic>.from(sessionData))
          : null,
      requiresRegistration: data['requiresRegistration'] == true,
      requiresApproval: data['requiresApproval'] == true,
      registrationToken: data['registrationToken']?.toString(),
      googleEmail: googleUser['email']?.toString(),
      googleName: googleUser['name']?.toString(),
    );
  }

  @override
  List<Object?> get props => [
    success,
    message,
    user,
    session,
    requiresRegistration,
    requiresApproval,
    registrationToken,
    googleEmail,
    googleName,
  ];
}
