import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

/// خدمة التعامل مع Deep Links من الإيميل (verification / reset password)
///
/// الصيغ المدعومة:
/// - medreach://email_verification?token=xxx
/// - medreach://reset_password?token=xxx
/// - https://yourdomain.com/email_verification?token=xxx  (لو Universal Links)
class DeepLinkService {
  DeepLinkService._();
  static final DeepLinkService instance = DeepLinkService._();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;

  /// callback لما يجي لينك جديد (التطبيق مفتوح أو اتفتح من اللينك)
  void Function(Uri uri)? onLink;

  /// تهيئة الاستماع للينكات
  Future<void> init() async {
    // لينك فتح التطبيق لأول مرة (cold start)
    try {
      final initial = await _appLinks.getInitialLink();
      if (initial != null) {
        debugPrint('[DeepLink] initial: $initial');
        onLink?.call(initial);
      }
    } catch (e) {
      debugPrint('[DeepLink] getInitialLink error: $e');
    }

    // لينكات وأنا التطبيق شغال (warm / background)
    _sub?.cancel();
    _sub = _appLinks.uriLinkStream.listen(
      (uri) {
        debugPrint('[DeepLink] stream: $uri');
        onLink?.call(uri);
      },
      onError: (e) => debugPrint('[DeepLink] stream error: $e'),
    );
  }

  void dispose() {
    _sub?.cancel();
    _sub = null;
  }

  /// تحويل الـ Uri لمسار التطبيق + arguments
  /// بيرجع null لو اللينك مش تابع للتطبيق
  static DeepLinkRoute? parse(Uri uri) {
    // scheme مخصص: medreach://email_verification?token=...
    // أو https:   https://host/email_verification?token=...
    final path = _extractPath(uri);
    final token = uri.queryParameters['token'];
    final email = uri.queryParameters['email'];

    if (path == null) return null;

    if (path == 'email_verification' || path == 'auth/verify-email') {
      return DeepLinkRoute(
        routeName: '/email_verification',
        arguments: {
          if (token != null && token.isNotEmpty) 'token': token,
          if (email != null && email.isNotEmpty) 'email': email,
        },
      );
    }

    if (path == 'reset_password' || path == 'auth/reset-password') {
      return DeepLinkRoute(
        routeName: '/reset_password',
        arguments: {
          if (token != null && token.isNotEmpty) 'token': token,
        },
      );
    }

    return null;
  }

  static String? _extractPath(Uri uri) {
    // medreach://email_verification?token=...
    // → host = email_verification, path = /
    if (uri.scheme == 'medreach') {
      final host = uri.host;
      if (host.isNotEmpty) return host;
      final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
      if (segments.isNotEmpty) return segments.join('/');
      return null;
    }

    // https://example.com/email_verification?token=...
    // أو https://example.com/auth/verify-email?token=...
    final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
    if (segments.isEmpty) return null;
    return segments.join('/');
  }
}

class DeepLinkRoute {
  final String routeName;
  final Map<String, String> arguments;

  const DeepLinkRoute({
    required this.routeName,
    this.arguments = const {},
  });
}
