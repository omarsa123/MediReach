import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/services/user_preferences.dart';
import '../../../../feature/auth/widgets/auth_role_tab_selector.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_social_button.dart';
import '../../widgets/auth_text_field.dart';
import '../../widgets/auth_snack_bar.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';

class PatientLoginView extends StatefulWidget {
  const PatientLoginView({super.key, this.initialRole});

  final AuthRole? initialRole;

  @override
  State<PatientLoginView> createState() => _PatientLoginViewState();
}

class _PatientLoginViewState extends State<PatientLoginView> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _rememberMe = false;

  bool get isProvider => widget.initialRole == AuthRole.provider;

  String? get expectedRole =>
      widget.initialRole == null ? null : (isProvider ? 'provider' : 'patient');

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onSignIn() {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    context.read<AuthCubit>().loginUser(
      email: _identifierController.text.trim(),
      password: _passwordController.text,
      expectedRole: expectedRole,
      rememberMe: _rememberMe,
    );
  }

  Future<void> _onGooglePressed() async {
    debugPrint('=== GOOGLE BUTTON CLICKED! ===');

    final roleParam = expectedRole ?? 'patient';

    await UserPreferences.savePendingGoogleLogin(
      role: roleParam,
      rememberMe: _rememberMe,
    );

    if (!mounted) return;

    final authCubit = context.read<AuthCubit>();
    final url = await authCubit.getGoogleAuthUrl(role: roleParam);

    debugPrint('GOOGLE AUTH URL RECEIVED: $url');

    if (!mounted) return;

    if (url == null || url.isEmpty) {
      await UserPreferences.clearPendingGoogleLogin();
      if (!mounted) return;
      AuthSnackBar.show(
        context,
        'Server failed to return Google sign-in URL. Check backend connection.',
        type: AuthSnackBarType.error,
      );
      return;
    }

    final uri = Uri.tryParse(url);

    if (uri == null || !uri.hasScheme) {
      await UserPreferences.clearPendingGoogleLogin();
      if (!mounted) return;
      AuthSnackBar.show(
        context,
        'The Google sign-in link is invalid.',
        type: AuthSnackBarType.error,
      );
      return;
    }

    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);

      if (!opened && mounted) {
        await UserPreferences.clearPendingGoogleLogin();
        if (!mounted) return;
        AuthSnackBar.show(
          context,
          'Could not launch external browser for Google sign-in.',
          type: AuthSnackBarType.error,
        );
      }
    } catch (e) {
      debugPrint('LAUNCH URL ERROR: $e');
      await UserPreferences.clearPendingGoogleLogin();
      if (mounted) {
        AuthSnackBar.show(
          context,
          'Error opening browser: $e',
          type: AuthSnackBarType.error,
        );
      }
    }
  }

  void _onSignUp() {
    Navigator.pushNamed(context, '/select_role');
  }

  @override
  Widget build(BuildContext context) {
    final appBarTitle = 'SIGN IN';
    const subhead = 'Sign in to continue to your account.';
    const identifierLabel = 'Email Address';
    const identifierHint = 'Enter your email address';

    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          final user = state.user;

          if (user.isDoctor) {
            Navigator.pushReplacementNamed(context, '/doctor_dashboard');
          } else if (user.isPatient) {
            Navigator.pushReplacementNamed(context, '/patient_home');
          } else {
            Navigator.pushReplacementNamed(context, '/select_role');
          }
        } else if (state is AuthEmailNotVerified) {
          AuthSnackBar.show(
            context,
            state.message,
            type: AuthSnackBarType.warning,
          );

          Navigator.pushNamed(
            context,
            '/email_verification',
            arguments: state.email,
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
          appBar: AuthAppBar(title: appBarTitle),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),

                    const Center(child: AuthHeader()),

                    const SizedBox(height: 30),

                    const Text(
                      'Welcome back!',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                    ),

                    const SizedBox(height: 4),

                    Text(
                      subhead,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.secondary,
                        fontWeight: FontWeight.w400,
                      ),
                    ),

                    const SizedBox(height: 24),

                    AuthTextField(
                      label: identifierLabel,
                      hintText: identifierHint,
                      controller: _identifierController,
                      prefixIcon: Icons.mail_outline_rounded,
                      validator: Validators.email,
                    ),

                    const SizedBox(height: 14),

                    AuthTextField(
                      label: 'Password',
                      hintText: 'Enter your password',
                      controller: _passwordController,
                      isPassword: true,
                      prefixIcon: Icons.lock_outline_rounded,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your password';
                        }

                        return null;
                      },
                    ),

                    const SizedBox(height: 10),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            SizedBox(
                              height: 24,
                              width: 24,
                              child: Checkbox(
                                value: _rememberMe,
                                activeColor: AppColors.button1background,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                side: const BorderSide(
                                  color: AppColors.inputBorder,
                                  width: 1.5,
                                ),
                                onChanged: (value) {
                                  setState(() {
                                    _rememberMe = value ?? false;
                                  });
                                },
                              ),
                            ),

                            const SizedBox(width: 8),

                            const Text(
                              'Remember me',
                              style: TextStyle(
                                fontSize: 13,
                                color: Color(0xFF475569),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),

                        GestureDetector(
                          onTap: () {
                            Navigator.pushNamed(context, '/forgot_password');
                          },
                          child: const Text(
                            'Forgot password?',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.button1background,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 22),

                    AuthButton(
                      label: 'Sign in',
                      isLoading: isLoading,
                      onPressed: _onSignIn,
                    ),

                    const SizedBox(height: 22),

                    AuthSocialButton(onGooglePressed: _onGooglePressed),

                    const SizedBox(height: 22),

                    Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            "Don't have an account? ",
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.secondary,
                            ),
                          ),

                          GestureDetector(
                            onTap: _onSignUp,
                            child: const Text(
                              'Sign up',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.button1background,
                              ),
                            ),
                          ),
                        ],
                      ),
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
