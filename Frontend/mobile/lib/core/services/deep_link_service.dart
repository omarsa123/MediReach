import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

/// Handles app links for email verification, password reset, and Google OAuth.
class DeepLinkService {
  DeepLinkService._();

  static final DeepLinkService instance = DeepLinkService._();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _subscription;

  void Function(Uri uri)? _onLink;
  Uri? _pendingInitialLink;
  bool _initialized = false;

  set onLink(void Function(Uri uri)? callback) {
    _onLink = callback;
    final pending = _pendingInitialLink;
    if (callback != null && pending != null) {
      _pendingInitialLink = null;
      callback(pending);
    }
  }

  /// Call after assigning [onLink].
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    _subscription = _appLinks.uriLinkStream.listen(
      _dispatch,
      onError: (Object error) => debugPrint('[DeepLink] stream error: $error'),
    );

    try {
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null) {
        debugPrint('[DeepLink] initial: $initialLink');
        _dispatch(initialLink);
      }
    } catch (error) {
      debugPrint('[DeepLink] getInitialLink error: $error');
    }
  }

  void _dispatch(Uri uri) {
    debugPrint('[DeepLink] received: $uri');
    final callback = _onLink;
    if (callback == null) {
      _pendingInitialLink = uri;
      return;
    }
    callback(uri);
  }

  void dispose() {
    _subscription?.cancel();
    _subscription = null;
    _initialized = false;
    _pendingInitialLink = null;
  }

  static bool isGoogleCallback(Uri uri) {
    final schemeMatch =
        uri.scheme == 'medreach' ||
        uri.scheme == 'https' ||
        uri.scheme == 'http';
    final hostMatch =
        uri.host == 'google-callback' ||
        uri.host == 'auth' ||
        uri.path.contains('auth');
    final hasOAuthParams =
        uri.queryParameters.containsKey('access_token') ||
        uri.queryParameters.containsKey('refresh_token') ||
        uri.queryParameters.containsKey('code') ||
        uri.queryParameters.containsKey('error') ||
        uri.fragment.contains('access_token') ||
        uri.fragment.contains('code');

    return schemeMatch && (hostMatch || hasOAuthParams);
  }

  /// Supabase may return OAuth tokens in the URI fragment rather than query.
  static Map<String, String> extractOAuthParameters(Uri uri) {
    final parameters = <String, String>{...uri.queryParameters};
    final fragment = uri.fragment;
    if (fragment.isNotEmpty) {
      final normalized = fragment.startsWith('?')
          ? fragment.substring(1)
          : fragment;
      try {
        parameters.addAll(Uri.splitQueryString(normalized));
      } catch (error) {
        debugPrint('[DeepLink] Could not parse OAuth fragment: $error');
      }
    }
    return parameters;
  }

  /// Convert email links into app routes.
  static DeepLinkRoute? parse(Uri uri) {
    final path = _extractPath(uri);
    final email = uri.queryParameters['email'];
    final otp = uri.queryParameters['otp'];
    final token = uri.queryParameters['token'];
    if (path == null) return null;

    if (path == 'email_verification' || path == 'auth/verify-email') {
      return DeepLinkRoute(
        routeName: '/email_verification',
        arguments: {
          if (email != null && email.isNotEmpty) 'email': email,
          if (otp != null && otp.isNotEmpty) 'otp': otp,
          if (token != null && token.isNotEmpty) 'token': token,
        },
      );
    }

    if (path == 'reset_password' || path == 'auth/reset-password') {
      return DeepLinkRoute(
        routeName: '/reset_password',
        arguments: {
          if (email != null && email.isNotEmpty) 'email': email,
          if (otp != null && otp.isNotEmpty) 'otp': otp,
          if (token != null && token.isNotEmpty) 'token': token,
        },
      );
    }
    return null;
  }

  static String? _extractPath(Uri uri) {
    if (uri.scheme == 'medreach') {
      if (uri.host.isNotEmpty) return uri.host;
      final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
      return segments.isEmpty ? null : segments.join('/');
    }
    final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
    return segments.isEmpty ? null : segments.join('/');
  }
}

class DeepLinkRoute {
  final String routeName;
  final Map<String, String> arguments;

  const DeepLinkRoute({required this.routeName, this.arguments = const {}});
}
