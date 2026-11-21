import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'api_exceptions.dart';

class ApiClient {
  static String get defaultBaseUrl {
  if (kIsWeb) return 'http://localhost:5050';

  try {
    if (Platform.isAndroid) {
      return 'http://192.168.1.6:5050';
    }
  } catch (_) {}

  return 'http://localhost:5050';
}

  final String baseUrl;
  final http.Client _client;
  static const Duration timeoutDuration = Duration(seconds: 15);

  ApiClient({
    String? baseUrl,
    http.Client? client,
  })  : baseUrl = baseUrl ?? defaultBaseUrl,
        _client = client ?? http.Client();

  Map<String, String> _headers([String? token]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

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
    } on ApiException {
      rethrow;
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
    } catch (e) {
      if (e is ApiException) rethrow;
      final msg = e.toString().toLowerCase();
      if (msg.contains('socket') ||
          msg.contains('network') ||
          msg.contains('connection') ||
          msg.contains('failed host lookup')) {
        throw const NetworkException();
      }
      throw NetworkException(message: 'Network error. Please try again.');
    }
  }

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
    } on ApiException {
      rethrow;
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
    } catch (e) {
      if (e is ApiException) rethrow;
      final msg = e.toString().toLowerCase();
      if (msg.contains('socket') ||
          msg.contains('network') ||
          msg.contains('connection') ||
          msg.contains('failed host lookup')) {
        throw const NetworkException();
      }
      throw NetworkException(message: 'Network error. Please try again.');
    }
  }

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
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw const NetworkException(
        message: 'Request timed out. Please try again.',
      );
    } on SocketException {
      throw const NetworkException();
    } catch (e) {
      if (e is ApiException) rethrow;
      final msg = e.toString().toLowerCase();
      if (msg.contains('socket') ||
          msg.contains('network') ||
          msg.contains('connection')) {
        throw const NetworkException();
      }
      throw NetworkException(message: 'Network error. Please try again.');
    }
  }

  Uri _buildUri(String path, [Map<String, String>? queryParameters]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$baseUrl$cleanPath';
    final uri = Uri.parse(fullUrl);
    if (queryParameters != null && queryParameters.isNotEmpty) {
      return uri.replace(queryParameters: queryParameters);
    }
    return uri;
  }

  dynamic _handleResponse(http.Response response) {
    dynamic jsonBody;
    try {
      if (response.body.isNotEmpty) {
        jsonBody = jsonDecode(response.body);
      }
    } catch (_) {
      throw ApiException(
        message:
            'Invalid response format from server (${response.statusCode})',
        statusCode: response.statusCode,
      );
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonBody;
    }

    String message = 'An unexpected error occurred';
    String? code;
    Map<String, dynamic>? data;

    if (jsonBody is Map<String, dynamic>) {
      message = jsonBody['error']?.toString() ??
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
