import 'package:shared_preferences/shared_preferences.dart';

class UserPreferences {
  static const String _keySelectedRole = 'selected_role';
  static const String _keyIsVisited = 'isVisit';
  static const String _keyUserId = 'user_id';
  static const String _keyUserName = 'user_name';
  static const String _keyUserEmail = 'user_email';

  /// Save the user role ('patient' or 'provider' / 'doctor')
  static Future<void> saveRole(String role) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySelectedRole, role);
  }

  /// Retrieve the stored role, or null if none was saved
  static Future<String?> getRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keySelectedRole);
  }

  /// Remove stored role
  static Future<void> clearRole() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keySelectedRole);
  }

  /// Check if the onboarding has been completed
  static Future<bool> isVisited() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyIsVisited) ?? false;
  }

  /// Set onboarding completed status
  static Future<void> setVisited(bool visited) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyIsVisited, visited);
  }

  /// Save basic user info for fast access
  static Future<void> saveUserInfo({
    required String userId,
    required String name,
    required String email,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUserId, userId);
    await prefs.setString(_keyUserName, name);
    await prefs.setString(_keyUserEmail, email);
  }

  /// Clear user info on logout
  static Future<void> clearUserInfo() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUserId);
    await prefs.remove(_keyUserName);
    await prefs.remove(_keyUserEmail);
  }
}
