import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';

class EmailVerificationView extends StatefulWidget {
  const EmailVerificationView({
    super.key,
    this.email,
  });

  final String? email;

  @override
  State<EmailVerificationView> createState() => _EmailVerificationViewState();
}

class _EmailVerificationViewState extends State<EmailVerificationView> {
  bool _isLoading = false;

  void _onVerifyEmail() {
    setState(() => _isLoading = true);
    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      setState(() => _isLoading = false);
      Navigator.pushNamed(context, '/reset_password');
    });
  }

  void _onResend() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Verification link resent to your email.'),
        backgroundColor: AppColors.button1background,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final routeEmail = ModalRoute.of(context)?.settings.arguments as String?;
    final displayEmail = widget.email ?? routeEmail ?? 'yourname@email.com';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AuthAppBar(
        showTrailing: false,
      ),
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
                    color: AppColors.button1background.withValues(alpha: 0.25),
                    width: 2,
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.mail_outline_rounded,
                    size: 36,
                    color: AppColors.button1background,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Check your email',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 8),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  "We've sent a verification link to your email address. Please check your inbox to continue.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w400,
                    height: 1.45,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.inputBackground,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.inputBorder, width: 1.2),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.inputBorder, width: 1),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.mark_email_read_outlined,
                          size: 20,
                          color: AppColors.button1background,
                        ),
                      ),
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
              const SizedBox(height: 28),
              AuthButton(
                label: 'Verify email',
                showArrow: false,
                isLoading: _isLoading,
                onPressed: _onVerifyEmail,
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    "Didn't receive the email? ",
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.secondary,
                    ),
                  ),
                  GestureDetector(
                    onTap: _onResend,
                    child: const Text(
                      'Resend',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.button1background,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
