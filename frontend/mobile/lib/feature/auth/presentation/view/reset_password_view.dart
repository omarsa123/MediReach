import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_text_field.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';

class ResetPasswordView extends StatefulWidget {
  const ResetPasswordView({super.key, this.token});

  final String? token;

  @override
  State<ResetPasswordView> createState() => _ResetPasswordViewState();
}

class _ResetPasswordViewState extends State<ResetPasswordView> {
  final _formKey = GlobalKey<FormState>();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _onResetPassword(String effectiveToken) {
    if (_formKey.currentState?.validate() ?? false) {
      if (effectiveToken.isEmpty) {
        // If no token in route, navigate to login with guidance
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please click the reset password link sent to your email.'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      context.read<AuthCubit>().resetPassword(
            effectiveToken,
            _newPasswordController.text,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final routeArgs = ModalRoute.of(context)?.settings.arguments;
    final routeToken = routeArgs is String
        ? routeArgs
        : (routeArgs is Map<String, dynamic> ? routeArgs['token']?.toString() : null);
    final effectiveToken = widget.token ?? routeToken ?? '';

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
            SnackBar(
              content: Text(state.message),
              backgroundColor: Colors.red,
            ),
          );
        }
      },
      builder: (context, state) {
        final isLoading = state is AuthLoading;

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
                      onPressed: () => _onResetPassword(effectiveToken),
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
