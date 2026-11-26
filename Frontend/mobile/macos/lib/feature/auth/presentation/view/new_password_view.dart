
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

class NewPasswordView extends StatefulWidget {
  const NewPasswordView({
    super.key,
    required this.email,
    required this.otp,
  });

  final String email;
  final String otp;

  @override
  State<NewPasswordView> createState() => _NewPasswordViewState();
}

class _NewPasswordViewState extends State<NewPasswordView> {
  final _formKey = GlobalKey<FormState>();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _resetPassword() {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    context.read<AuthCubit>().resetPassword(
  email: widget.email,
  otp: widget.otp,
  newPassword: _newPasswordController.text,
);
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthPasswordResetSuccess) {
          AuthSnackBar.show(context, state.message, type: AuthSnackBarType.success);

          Navigator.pushNamedAndRemoveUntil(
            context,
            '/patient_login',
            (route) => false,
          );
        } else if (state is AuthError) {
          AuthSnackBar.show(context, state.message, type: AuthSnackBarType.error);
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
                      'Create new password',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 8),

                    const Text(
                      'Create a new password for your account.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.secondary,
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
                      validator: (value) {
                        if (value == null || value.length < 8) {
                          return 'Must be at least 8 characters';
                        }

                        final hasLetter =
                            RegExp(r'[a-zA-Z]').hasMatch(value);
                        final hasDigit =
                            RegExp(r'[0-9]').hasMatch(value);

                        if (!hasLetter || !hasDigit) {
                          return 'Must include letters and numbers';
                        }

                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    AuthTextField(
                      label: 'Confirm password',
                      hintText: 'Confirm new password',
                      controller: _confirmPasswordController,
                      isPassword: true,
                      prefixIcon: Icons.lock_outline_rounded,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please confirm your password';
                        }

                        if (value != _newPasswordController.text) {
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
                      onPressed: _resetPassword,
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
