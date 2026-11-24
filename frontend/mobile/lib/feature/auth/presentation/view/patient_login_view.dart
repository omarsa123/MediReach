import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_role_tab_selector.dart';
import '../../widgets/auth_social_button.dart';
import '../../widgets/auth_text_field.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';

class PatientLoginView extends StatefulWidget {
  const PatientLoginView({super.key, this.initialRole = AuthRole.patient});

  final AuthRole initialRole;

  @override
  State<PatientLoginView> createState() => _PatientLoginViewState();
}

class _PatientLoginViewState extends State<PatientLoginView> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

  late AuthRole _selectedRole;
  bool _rememberMe = false;

  @override
  void initState() {
    super.initState();
    _selectedRole = widget.initialRole;
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onSignIn() {
    if (_formKey.currentState?.validate() ?? false) {
      String expectedRole = 'patient';
      if (_selectedRole == AuthRole.doctor) {
        expectedRole = 'provider';
      } else if (_selectedRole == AuthRole.organizer) {
        expectedRole = 'organization';
      }

      context.read<AuthCubit>().loginUser(
        email: _identifierController.text.trim(),
        password: _passwordController.text,
        expectedRole: expectedRole,
      );
    }
  }

  Future<void> _onGooglePressed() async {
    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'medreach://auth', // متطابق مع الـ Manifest و Supabase
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
    } on AuthException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Google Login Error: ${error.message}'),
          backgroundColor: Colors.red,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Unexpected Error: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _onSignUp() {
    if (_selectedRole == AuthRole.doctor) {
      Navigator.pushReplacementNamed(context, '/doctor_register');
    } else {
      Navigator.pushReplacementNamed(context, '/patient_register');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDoctor = _selectedRole == AuthRole.doctor;
    final isOrganizer = _selectedRole == AuthRole.organizer;

    final appBarTitle = isDoctor
        ? 'DOCTOR LOGIN'
        : isOrganizer
        ? 'ORGANIZER LOGIN'
        : 'PATIENT LOGIN';

    final subhead = isDoctor
        ? 'Sign in to manage your practice and appointments.'
        : isOrganizer
        ? 'Sign in to manage your clinic and staff.'
        : 'Sign in to manage your health and appointments.';

    final identifierLabel = isDoctor
        ? 'Email Address / Doctor ID'
        : isOrganizer
        ? 'Organization ID / Email'
        : 'Email or Phone number';

    final identifierHint = isDoctor
        ? 'doctor@medicare.com'
        : isOrganizer
        ? 'admin@hospital.com'
        : 'Enter your email or phone';

    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          final user = state.user;

          // التوجيه الذكي حسب دور المستخدم (Role) مع تفادي اللودينج العالق
          if (user.isDoctor) {
            Navigator.pushReplacementNamed(context, '/doctor_dashboard');
          } else if (user.isPatient) {
            Navigator.pushReplacementNamed(
              context,
              '/patient_home',
            ); // أو شاشة الهوم للمريض
          } else {
            Navigator.pushReplacementNamed(context, '/select_role');
          }
        } else if (state is AuthEmailNotVerified) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: Colors.orange.shade800,
            ),
          );
          Navigator.pushNamed(
            context,
            '/email_verification',
            arguments: state.email,
          );
        } else if (state is AuthError) {
          // هنا الكيوبيت بيطلع من حالة التحميل تلقائياً لما يبعت AuthError
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: Colors.red),
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
                    const SizedBox(height: 20),
                    AuthRoleTabSelector(
                      selectedRole: _selectedRole,
                      onRoleChanged: (role) {
                        setState(() {
                          _selectedRole = role;
                        });
                      },
                    ),
                    const SizedBox(height: 22),
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
                    const SizedBox(height: 20),
                    AuthTextField(
                      label: identifierLabel,
                      hintText: identifierHint,
                      controller: _identifierController,
                      prefixIcon: Icons.mail_outline_rounded,
                      validator: Validators.emailOrPhone,
                    ),
                    const SizedBox(height: 14),
                    AuthTextField(
                      label: 'Password',
                      hintText: 'Enter your password',
                      controller: _passwordController,
                      isPassword: true,
                      prefixIcon: Icons.lock_outline_rounded,
                      validator: (v) => (v == null || v.isEmpty)
                          ? 'Please enter your password'
                          : null,
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
                                onChanged: (val) {
                                  setState(() => _rememberMe = val ?? false);
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
