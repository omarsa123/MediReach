import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';

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
  String? _tokenFromLink;
  bool _autoVerifyStarted = false;
  bool _linkSent = false;

  /// JWT عادةً 3 أجزاء مفصولة بنقطتين (header.payload.signature)
  bool _looksLikeJwt(String value) {
    final parts = value.split('.');
    return parts.length == 3 &&
        parts.every((p) => p.isNotEmpty) &&
        !value.contains('@');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_autoVerifyStarted) return;

    final args = ModalRoute.of(context)?.settings.arguments;
    String? token;

    if (args is Map) {
      final t = args['token']?.toString();
      if (t != null && t.isNotEmpty && _looksLikeJwt(t)) {
        token = t;
      }
    } else if (args is String && _looksLikeJwt(args)) {
      token = args;
    }

    if (token != null) {
      _tokenFromLink = token;
      _autoVerifyStarted = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        context.read<AuthCubit>().verifyEmail(token!);
      });
    }
  }

  String _resolveEmail() {
    final routeArgs = ModalRoute.of(context)?.settings.arguments;
    String? routeEmail;

    if (routeArgs is Map) {
      routeEmail = routeArgs['email']?.toString();
    } else if (routeArgs is String && !_looksLikeJwt(routeArgs)) {
      // بعد التسجيل بنبعت الإيميل كـ argument نصي
      routeEmail = routeArgs;
    }

    return widget.email ?? routeEmail ?? '';
  }

  /// زرار Verify: يبعت لينك التفعيل فقط (مش بيعمل verify بالتوكن)
  void _onSendVerificationLink(String email) {
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

  @override
  Widget build(BuildContext context) {
    final displayEmail = _resolveEmail();
    final hasEmail = displayEmail.isNotEmpty && displayEmail != 'yourname@email.com';
    final isFromDeepLink = _tokenFromLink != null && _tokenFromLink!.isNotEmpty;

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
          // مظهرش invalid token لو مفيش توكن أصلاً (حالة زرار الإرسال)
          final isTokenError = state.code == 'INVALID_TOKEN' ||
              state.message.toLowerCase().contains('invalid') &&
                  state.message.toLowerCase().contains('token');

          if (isTokenError && !isFromDeepLink) {
            // تجاهل — ده كان بيحصل غلط لما الإيميل اتفك كتوكن
            return;
          }

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                isTokenError
                    ? 'This verification link is invalid or has expired. Please request a new one.'
                    : state.message,
              ),
              backgroundColor: Colors.red,
            ),
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
                        color: AppColors.button1background.withValues(alpha: 0.25),
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        isFromDeepLink
                            ? Icons.verified_outlined
                            : Icons.mail_outline_rounded,
                        size: 36,
                        color: AppColors.button1background,
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    isFromDeepLink
                        ? 'Verifying your email'
                        : _linkSent
                            ? 'Check your inbox'
                            : 'Verify your email',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    isFromDeepLink
                        ? 'Please wait while we confirm your email address...'
                        : _linkSent
                            ? 'We sent a verification link to your email. Open it to activate your account.'
                            : 'Tap the button below to receive a verification link on your email.',
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
                  const SizedBox(height: 28),

                  // من Deep Link → بنعمل verify تلقائي (مفيش زرار إرسال)
                  if (isFromDeepLink)
                    AuthButton(
                      label: isLoading ? 'Verifying...' : 'Verifying email',
                      showArrow: false,
                      isLoading: isLoading,
                      onPressed: isLoading
                          ? null
                          : () {
                              if (_tokenFromLink != null) {
                                context
                                    .read<AuthCubit>()
                                    .verifyEmail(_tokenFromLink!);
                              }
                            },
                    )
                  else ...[
                    // بعد التسجيل: زرار بيبعت اللينك فقط
                    AuthButton(
                      label: _linkSent
                          ? (isLoading ? 'Sending...' : 'Resend link')
                          : (isLoading ? 'Sending...' : 'Send verification link'),
                      showArrow: false,
                      isLoading: isLoading,
                      onPressed: isLoading
                          ? null
                          : () => _onSendVerificationLink(displayEmail),
                    ),
                    if (_linkSent) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Didn\'t get the email? Check spam, or resend.',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.secondary.withValues(alpha: 0.9),
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ],

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
