class Validators {
  Validators._();

  static final RegExp _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
  );

  /// اسم: حرفين على الأقل، حروف ومسافات فقط (عربي/إنجليزي)
  static String? name(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Please enter your full name';
    if (v.length < 2) return 'Name must be at least 2 characters';
    if (v.length > 80) return 'Name is too long';
    if (!RegExp(r"^[\u0600-\u06FFa-zA-Z\s'.\-]+$").hasMatch(v)) {
      return 'Name can only contain letters and spaces';
    }
    return null;
  }

  static String? email(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Please enter your email';
    if (!_emailRegex.hasMatch(v)) return 'Enter a valid email address';
    return null;
  }

  /// رقم محلي بدون كود الدولة (بعد إزالة الأصفار في الأول)
  static String? phone(String? value, {String countryCode = '+20'}) {
    final raw = value?.trim() ?? '';
    if (raw.isEmpty) return 'Please enter your phone number';
    final digits = raw.replaceAll(RegExp(r'[^\d]'), '');
    if (digits.isEmpty) return 'Enter a valid phone number';

    // مصر
    if (countryCode == '+20') {
      final local = digits.replaceFirst(RegExp(r'^0+'), '');
      if (local.length != 10 || !local.startsWith('1')) {
        return 'Enter a valid Egyptian mobile (e.g. 1xxxxxxxxx)';
      }
      return null;
    }

    if (digits.length < 8 || digits.length > 15) {
      return 'Enter a valid phone number';
    }
    return null;
  }

  static String? password(String? value, {int minLength = 8}) {
  final v = value ?? '';

  if (v.isEmpty) {
    return 'Please enter a password';
  }

  if (v.length < minLength) {
    return 'Password must be at least $minLength characters';
  }

  if (!RegExp(r'[A-Z]').hasMatch(v)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!RegExp(r'[a-z]').hasMatch(v)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!RegExp(r'[0-9]').hasMatch(v)) {
    return 'Password must contain at least one number';
  }

  if (!RegExp(r'[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];`~]').hasMatch(v)) {
    return 'Password must contain at least one special character';
  }

  return null;
}

  static String? confirmPassword(String? value, String password) {
    if (value == null || value.isEmpty) {
      return 'Please confirm your password';
    }
    if (value != password) return 'Passwords do not match';
    return null;
  }

  /// للوجين: إيميل أو فون
  static String? emailOrPhone(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Please enter your email or phone';
    if (v.contains('@')) return email(v);
    final digits = v.replaceAll(RegExp(r'[^\d+]'), '');
    if (digits.length < 8) return 'Enter a valid email or phone number';
    return null;
  }
}
