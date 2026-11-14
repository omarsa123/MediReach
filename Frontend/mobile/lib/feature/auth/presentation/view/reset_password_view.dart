import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_text_field.dart';

class ResetPasswordView extends StatefulWidget {
  const ResetPasswordView({super.key});

  @override
  State<ResetPasswordView> createState() => _ResetPasswordViewState();
}

class _ResetPasswordViewState extends State<ResetPasswordView> {
  final _formKey = GlobalKey<FormState>();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _onResetPassword() {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() => _isLoading = true);
      Future.delayed(const Duration(milliseconds: 600), () {
        if (!mounted) return;
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password reset successfully! Please sign in.'),
            backgroundColor: AppColors.button1background,
          ),
        );
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/patient_login',
          (route) => false,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AuthAppBar(
        showTrailing: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                const Center(child: AuthHeader()),
                const SizedBox(height: 32),
                const Text(
                  'Reset password',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Your new password must be different from previously used passwords.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w400,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 24),
                AuthTextField(
                  label: 'New password',
                  hintText: 'Enter new password',
                  controller: _newPasswordController,
                  isPassword: true,
                  prefixIcon: Icons.lock_outline_rounded,
                  validator: (v) {
                    if (v == null || v.length < 8) {
                      return 'Must be at least 8 characters';
                    }
                    final hasLetter = RegExp(r'[a-zA-Z]').hasMatch(v);
                    final hasDigit = RegExp(r'[0-9]').hasMatch(v);
                    if (!hasLetter || !hasDigit) {
                      return 'Must include both letters and numbers';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                AuthTextField(
                  label: 'Confirm password',
                  hintText: 'Confirm new password',
                  controller: _confirmPasswordController,
                  isPassword: true,
                  prefixIcon: Icons.lock_outline_rounded,
                  validator: (v) {
                    if (v != _newPasswordController.text) {
                      return 'Passwords do not match';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        '• At least 8 characters',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.secondary,
                          height: 1.5,
                        ),
                      ),
                      Text(
                        '• A mixture of letters and numbers',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.secondary,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                AuthButton(
                  label: 'Reset password',
                  showArrow: false,
                  isLoading: _isLoading,
                  onPressed: _onResetPassword,
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
