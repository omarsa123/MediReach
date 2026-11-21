import 'package:equatable/equatable.dart';

class AuthSessionModel extends Equatable {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final String tokenType;

  const AuthSessionModel({
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn = 3600,
    this.tokenType = 'bearer',
  });

  factory AuthSessionModel.fromJson(Map<String, dynamic> json) {
    return AuthSessionModel(
      accessToken: (json['accessToken'] ?? json['access_token'] ?? '').toString(),
      refreshToken: (json['refreshToken'] ?? json['refresh_token'] ?? '').toString(),
      expiresIn: json['expiresIn'] is int
          ? json['expiresIn']
          : int.tryParse(json['expiresIn']?.toString() ?? '3600') ?? 3600,
      tokenType: (json['tokenType'] ?? json['token_type'] ?? 'bearer').toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'expiresIn': expiresIn,
      'tokenType': tokenType,
    };
  }

  @override
  List<Object?> get props => [accessToken, refreshToken, expiresIn, tokenType];
}
