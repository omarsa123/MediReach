import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';

import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_text_field.dart';
import '../cubit/auth_state.dart';
import '../cubit/auth_cubit.dart';

class ResetPasswordView extends StatefulWidget {
  const ResetPasswordView({super.key, this.email});

  final String? email;

  @override
  State<ResetPasswordView> createState() => _ResetPasswordViewState();
}

class _ResetPasswordViewState extends State<ResetPasswordView> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.email != null && widget.email!.isNotEmpty) {
      _emailController.text = widget.email!;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // استقبال الإيميل لو تم تمريره عبر الـ route arguments
    if (_emailController.text.isEmpty) {
      final routeArgs = ModalRoute.of(context)?.settings.arguments;
      if (routeArgs is Map<String, dynamic>) {
        final routeEmail = routeArgs['email']?.toString();
        if (routeEmail != null && routeEmail.isNotEmpty) {
          _emailController.text = routeEmail;
        }
      } else if (routeArgs is String && routeArgs.contains('@')) {
        _emailController.text = routeArgs;
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _onResetPassword() {
    if (_formKey.currentState?.validate() ?? false) {
      final email = _emailController.text.trim();
      final otp = _otpController.text.trim();
      final newPassword = _newPasswordController.text;

      if (email.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter your email address.'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      if (otp.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter the verification code (OTP).'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      context.read<AuthCubit>().resetPassword(
        email: email,
        otp: otp,
        newPassword: newPassword,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthPasswordResetSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.button1background,
            ),
          );
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/patient_login',
            (route) => false,
          );
        } else if (state is AuthError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: Colors.red),
          );
        }
      },
      builder: (context, state) {
        final isLoading = state is AuthLoading;

        return Scaffold(
          backgroundColor: Colors.white,
          appBar: const AuthAppBar(showTrailing: false),
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
                      'Enter your email, the OTP code sent to your inbox, and your new password.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.secondary,
                        fontWeight: FontWeight.w400,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // حقل الإيميل
                    AuthTextField(
                      label: 'Email Address',
                      hintText: 'Enter your email',
                      controller: _emailController,
                      prefixIcon: Icons.email_outlined,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty || !v.contains('@')) {
                          return 'Please enter a valid email address';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // حقل إدخال الـ OTP
                    AuthTextField(
                      label: 'Verification Code (OTP)',
                      hintText: 'Enter code from email',
                      controller: _otpController,
                      prefixIcon: Icons.lock_clock_outlined,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'Please enter the OTP code';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // حقل كلمة المرور الجديدة
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

                    // حقل تأكيد كلمة المرور
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

                    const Padding(
                      padding: EdgeInsets.only(left: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
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
                      isLoading: isLoading,
                      onPressed: _onResetPassword,
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
