
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_colors.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_snack_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_text_field.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';

class ResetPasswordView extends StatefulWidget {
  const ResetPasswordView({super.key, this.email});

  final String? email;

  @override
  State<ResetPasswordView> createState() => _ResetPasswordViewState();
}

class _ResetPasswordViewState extends State<ResetPasswordView> {
  final _formKey = GlobalKey<FormState>();
  String _email = '';
  final _otpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _email = widget.email ?? '';
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_email.isEmpty) {
      final args = ModalRoute.of(context)?.settings.arguments;

      if (args is String && args.contains('@')) {
        _email = args;
      } else if (args is Map) {
        _email = args['email']?.toString() ?? '';
      }
    }
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _verifyOtp() {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    if (_email.trim().isEmpty) {
      AuthSnackBar.show(
        context,
        'Email address is missing. Please try again.',
        type: AuthSnackBarType.error,
      );
      return;
    }

    context.read<AuthCubit>().verifyResetOtp(
      email: _email.trim(),
      otp: _otpController.text.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthResetOtpVerified) {
          Navigator.pushNamed(
            context,
            '/new_password',
            arguments: {
              'email': state.email,
              'otp': _otpController.text.trim(),
            },
          );
        } else if (state is AuthError) {
          AuthSnackBar.show(
            context,
            state.message,
            type: AuthSnackBarType.error,
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
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 12,
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    const Center(child: AuthHeader()),
                    const SizedBox(height: 32),

                    const Text(
                      'Verify your email',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 8),

                    const Text(
                      "We've sent a reset code to:",
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.secondary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 12),

                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(9),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.email_outlined,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _email,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0F172A),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    const Text(
                      'Enter the 6-digit reset code below to continue.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.secondary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),

                    AuthTextField(
                      label: 'Verification Code (OTP)',
                      hintText: 'Enter code from email',
                      controller: _otpController,
                      prefixIcon: Icons.lock_clock_outlined,
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter the OTP code';
                        }

                        if (!RegExp(r'^\d{6}$').hasMatch(value.trim())) {
                          return 'OTP must be exactly 6 digits';
                        }

                        return null;
                      },
                    ),
                    const SizedBox(height: 28),

                    AuthButton(
                      label: 'Verify code',
                      showArrow: false,
                      isLoading: isLoading,
                      onPressed: _verifyOtp,
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
