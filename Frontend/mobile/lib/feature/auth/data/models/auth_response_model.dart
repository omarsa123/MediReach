import 'user_model.dart';
import 'auth_session_model.dart';

class AuthResponseModel {
  final bool success;
  final String message;
  final UserModel? user;
  final AuthSessionModel? session;

  const AuthResponseModel({
    required this.success,
    required this.message,
    this.user,
    this.session,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    UserModel? user;
    AuthSessionModel? session;

    final data = json['data'];
    if (data is Map<String, dynamic>) {
      if (data['user'] is Map<String, dynamic>) {
        user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      } else if (data['userId'] != null || data['id'] != null) {
        user = UserModel.fromJson(data);
      }

      if (data['session'] is Map<String, dynamic>) {
        session = AuthSessionModel.fromJson(data['session'] as Map<String, dynamic>);
      }
    } else if (json['user'] is Map<String, dynamic>) {
      user = UserModel.fromJson(json['user'] as Map<String, dynamic>);
      if (json['session'] is Map<String, dynamic>) {
        session = AuthSessionModel.fromJson(json['session'] as Map<String, dynamic>);
      }
    }

    return AuthResponseModel(
      success: json['success'] == true,
      message: (json['message'] ?? 'Success').toString(),
      user: user,
      session: session,
    );
  }
}
