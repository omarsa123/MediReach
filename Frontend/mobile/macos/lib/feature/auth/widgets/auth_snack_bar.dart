import 'package:flutter/material.dart';

/// Shared snackbar styling and presentation for all authentication screens.
enum AuthSnackBarType { success, error, warning, info }

class AuthSnackBar {
  const AuthSnackBar._();

  static void show(
    BuildContext context,
    String message, {
    AuthSnackBarType type = AuthSnackBarType.info,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: _background(type),
          elevation: 4,
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          content: Row(
            children: [
              Icon(_icon(type), color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
          duration: const Duration(seconds: 4),
        ),
      );
  }

  static Color _background(AuthSnackBarType type) => switch (type) {
        AuthSnackBarType.success => const Color(0xFF15803D),
        AuthSnackBarType.error => const Color(0xFFB42318),
        AuthSnackBarType.warning => const Color(0xFFB54708),
        AuthSnackBarType.info => const Color(0xFF1D4ED8),
      };

  static IconData _icon(AuthSnackBarType type) => switch (type) {
        AuthSnackBarType.success => Icons.check_circle_outline_rounded,
        AuthSnackBarType.error => Icons.error_outline_rounded,
        AuthSnackBarType.warning => Icons.warning_amber_rounded,
        AuthSnackBarType.info => Icons.info_outline_rounded,
      };
}
