import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_exceptions.dart';

class ApiClient {
  static String get defaultBaseUrl {
    return 'https://spindle-trousers-scarce.ngrok-free.dev';
  }

  final String baseUrl;
  final http.Client _client;

  static const Duration timeoutDuration = Duration(seconds: 15);

  ApiClient({String? baseUrl, http.Client? client})
    : baseUrl = _normalizeBaseUrl(baseUrl ?? defaultBaseUrl),
      _client = client ?? http.Client();

  // ============================================================
  // Helpers
  // ============================================================

  static String _normalizeBaseUrl(String url) {
    final normalized = url.trim().replaceAll(RegExp(r'/+$'), '');

    if (normalized.isEmpty) {
      throw ArgumentError('Base URL cannot be empty');
    }

    final uri = Uri.parse(normalized);

    if (!uri.hasScheme || !uri.hasAuthority) {
      throw ArgumentError('Invalid Base URL: $url');
    }

    return normalized;
  }

  Map<String, String> _headers([String? token]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token != null && token.trim().isNotEmpty) {
      headers['Authorization'] = 'Bearer ${token.trim()}';
    }

    return headers;
  }

  Uri _buildUri(String path, [Map<String, String>? queryParameters]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';

    final uri = Uri.parse('$baseUrl$cleanPath');

    if (queryParameters != null && queryParameters.isNotEmpty) {
      return uri.replace(queryParameters: queryParameters);
    }

    return uri;
  }

  // ============================================================
  // GET
  // ============================================================

  Future<dynamic> get(
    String path, {
    String? token,
    Map<String, String>? queryParameters,
  }) async {
    try {
      final uri = _buildUri(path, queryParameters);

      final response = await _client
          .get(uri, headers: _headers(token))
          .timeout(timeoutDuration);

      return _handleResponse(response);
    } on TimeoutException {
      throw const NetworkException(
        message: 'Request timed out. Please try again.',
      );
    } on SocketException {
      throw const NetworkException();
    } on HttpException {
      throw const NetworkException(
        message: 'Unable to reach the server. Please try again later.',
      );
    } on http.ClientException {
      throw const NetworkException(
        message: 'Unable to connect to the server. Please try again.',
      );
    }
  }

  // ============================================================
  // POST
  // ============================================================

  Future<dynamic> post(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      final uri = _buildUri(path);

      final response = await _client
          .post(
            uri,
            headers: _headers(token),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeoutDuration);

      return _handleResponse(response);
    } on TimeoutException {
      throw const NetworkException(
        message: 'Request timed out. Please try again.',
      );
    } on SocketException {
      throw const NetworkException();
    } on HttpException {
      throw const NetworkException(
        message: 'Unable to reach the server. Please try again later.',
      );
    } on http.ClientException {
      throw const NetworkException(
        message: 'Unable to connect to the server. Please try again.',
      );
    }
  }

  // ============================================================
  // PATCH
  // ============================================================

  Future<dynamic> patch(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      final uri = _buildUri(path);

      final response = await _client
          .patch(
            uri,
            headers: _headers(token),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeoutDuration);

      return _handleResponse(response);
    } on TimeoutException {
      throw const NetworkException(
        message: 'Request timed out. Please try again.',
      );
    } on SocketException {
      throw const NetworkException();
    } on HttpException {
      throw const NetworkException(
        message: 'Unable to reach the server. Please try again later.',
      );
    } on http.ClientException {
      throw const NetworkException(
        message: 'Unable to connect to the server. Please try again.',
      );
    }
  }

  // ============================================================
  // Response Handling
  // ============================================================

  dynamic _handleResponse(http.Response response) {
    dynamic jsonBody;

    try {
      if (response.body.isNotEmpty) {
        jsonBody = jsonDecode(response.body);
      }
    } on FormatException {
      throw ApiException(
        message:
            'Invalid response format from server '
            '(${response.statusCode})',
        statusCode: response.statusCode,
      );
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonBody;
    }

    String message = 'An unexpected error occurred';
    String? code;
    Map<String, dynamic>? data;

    if (jsonBody is Map) {
      message =
          jsonBody['error']?.toString() ??
          jsonBody['message']?.toString() ??
          message;

      code = jsonBody['code']?.toString();

      if (jsonBody['data'] is Map) {
        data = Map<String, dynamic>.from(jsonBody['data'] as Map);
      }
    }

    if (code == 'EMAIL_NOT_VERIFIED') {
      final email = data?['email']?.toString() ?? '';

      throw EmailNotVerifiedException(email: email, message: message);
    }

    if (response.statusCode == 401) {
      throw UnauthorizedException(message: message);
    }

    throw ApiException(
      message: message,
      statusCode: response.statusCode,
      code: code,
      data: data,
    );
  }
}
