import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';

class EmailVerificationView extends StatefulWidget {
  const EmailVerificationView({super.key, this.email});

  final String? email;

  @override
  State<EmailVerificationView> createState() => _EmailVerificationViewState();
}

class _EmailVerificationViewState extends State<EmailVerificationView> {
  final TextEditingController _otpController = TextEditingController();
  bool _linkSent = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  String _resolveEmail() {
    final routeArgs = ModalRoute.of(context)?.settings.arguments;
    String? routeEmail;

    if (routeArgs is Map) {
      routeEmail = routeArgs['email']?.toString();
    } else if (routeArgs is String) {
      routeEmail = routeArgs;
    }

    return widget.email ?? routeEmail ?? '';
  }

  /// إرسال كود الـ OTP للبريد الإلكتروني
  void _onSendVerificationCode(String email) {
    if (email.isEmpty || email == 'yourname@email.com') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid email address.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    context.read<AuthCubit>().resendVerification(email);
  }

  /// تنفيذ عملية التحقق باستخدام الـ Email و الـ OTP
  void _onVerifyOtp(String email) {
    final otp = _otpController.text.trim();
    if (otp.isEmpty || otp.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid verification code (OTP).'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Email address is missing.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    context.read<AuthCubit>().verifyEmail(email: email, otp: otp);
  }

  @override
  Widget build(BuildContext context) {
    final displayEmail = _resolveEmail();
    final hasEmail =
        displayEmail.isNotEmpty && displayEmail != 'yourname@email.com';

    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthEmailVerificationSuccess) {
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
        } else if (state is AuthEmailResent) {
          setState(() => _linkSent = true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.button1background,
            ),
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 16),
                  const AuthHeader(),
                  const SizedBox(height: 36),
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD9F5F0),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.button1background.withValues(
                          alpha: 0.25,
                        ),
                        width: 2,
                      ),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.mark_email_read_outlined,
                        size: 36,
                        color: AppColors.button1background,
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'Verify your email',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _linkSent
                        ? 'We have sent a verification code to your email. Enter it below.'
                        : 'Tap the button below to receive your verification code.',
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.45,
                      color: AppColors.secondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  if (hasEmail)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.email_outlined,
                            size: 20,
                            color: AppColors.secondary,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Email Address',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.secondary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  displayEmail,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0F172A),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 24),

                  // حقل إدخال كود الـ OTP
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Verification Code (OTP)',
                      hintText: 'Enter 4 or 6-digit code',
                      prefixIcon: const Icon(Icons.lock_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // زرار التحقق من الـ OTP
                  AuthButton(
                    label: isLoading ? 'Verifying...' : 'Verify Email',
                    showArrow: false,
                    isLoading: isLoading,
                    onPressed: isLoading
                        ? null
                        : () => _onVerifyOtp(displayEmail),
                  ),
                  const SizedBox(height: 16),

                  // زرار إرسال أو إعادة إرسال الكود
                  OutlinedButton(
                    onPressed: isLoading
                        ? null
                        : () => _onSendVerificationCode(displayEmail),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      _linkSent ? 'Resend Code' : 'Send Code',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.button1background,
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: isLoading
                        ? null
                        : () {
                            Navigator.pushNamedAndRemoveUntil(
                              context,
                              '/patient_login',
                              (route) => false,
                            );
                          },
                    child: const Text(
                      'Back to login',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.button1background,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
