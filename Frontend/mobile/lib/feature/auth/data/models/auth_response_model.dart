import 'package:medireach/feature/auth/data/models/auth_session_model.dart';

import 'user_model.dart';

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

    if (data is Map) {
      final dataMap = Map<String, dynamic>.from(data);

      final userData = dataMap['user'] ?? json['user'];

      if (userData is Map) {
        user = UserModel.fromJson(
          Map<String, dynamic>.from(userData),
        );
      } else if (dataMap['userId'] != null ||
          dataMap['id'] != null) {
        user = UserModel.fromJson(dataMap);
      }

      final sessionData = dataMap['session'] ?? json['session'];

      if (sessionData is Map) {
        session = AuthSessionModel.fromJson(
          Map<String, dynamic>.from(sessionData),
        );
      }
    } else {
      final userData = json['user'];

      if (userData is Map) {
        user = UserModel.fromJson(
          Map<String, dynamic>.from(userData),
        );
      }

      final sessionData = json['session'];

      if (sessionData is Map) {
        session = AuthSessionModel.fromJson(
          Map<String, dynamic>.from(sessionData),
        );
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
