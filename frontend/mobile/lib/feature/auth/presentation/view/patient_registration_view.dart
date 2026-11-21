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

class PatientRegistrationView extends StatefulWidget {
  const PatientRegistrationView({super.key});

  @override
  State<PatientRegistrationView> createState() => _PatientRegistrationViewState();
}

class _PatientRegistrationViewState extends State<PatientRegistrationView> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String _countryCode = '+20';

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _onCreateAccount() {
    if (_formKey.currentState?.validate() ?? false) {
      final cleanPhone = _phoneController.text.trim().replaceFirst(RegExp(r'^0+'), '');
      final fullPhone = '$_countryCode$cleanPhone';

      context.read<AuthCubit>().registerPatient(
            name: _fullNameController.text.trim(),
            email: _emailController.text.trim(),
            phone: fullPhone,
            password: _passwordController.text,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthRegistrationSuccess) {
          Navigator.pushNamed(
            context,
            '/email_verification',
            arguments: state.email,
          );
        } else if (state is AuthAuthenticated) {
          Navigator.pushReplacementNamed(context, '/patient_login');
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
            title: 'Patient Registration',
          ),
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
                    const SizedBox(height: 24),
                    const Text(
                      'Create your account',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Start your journey to better health.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.secondary,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 20),
                    AuthTextField(
                      label: 'Full Name',
                      hintText: 'Enter your full name',
                      controller: _fullNameController,
                      prefixIcon: Icons.person_outline_rounded,
                      validator: Validators.name,
                    ),
                    const SizedBox(height: 14),
                    AuthTextField(
                      label: 'Email Address',
                      hintText: 'Enter your email',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.mail_outline_rounded,
                      validator: Validators.email,
                    ),
                    const SizedBox(height: 14),
                    AuthTextField(
                      label: 'Phone Number',
                      hintText: 'Enter your phone number',
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      validator: (v) => Validators.phone(v, countryCode: _countryCode),
                      prefixWidget: Container(
                        padding: const EdgeInsets.only(left: 12, right: 6),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.phone_outlined,
                              size: 19,
                              color: Color(0xFF64748B),
                            ),
                            const SizedBox(width: 6),
                            DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _countryCode,
                                icon: const Icon(
                                  Icons.arrow_drop_down,
                                  color: Color(0xFF64748B),
                                  size: 18,
                                ),
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF334155),
                                ),
                                items: const [
                                  DropdownMenuItem(value: '+20', child: Text('+20')),
                                  DropdownMenuItem(value: '+1', child: Text('+1')),
                                  DropdownMenuItem(value: '+966', child: Text('+966')),
                                  DropdownMenuItem(value: '+971', child: Text('+971')),
                                ],
                                onChanged: (val) {
                                  if (val != null) setState(() => _countryCode = val);
                                },
                              ),
                            ),
                            Container(
                              height: 20,
                              width: 1,
                              margin: const EdgeInsets.only(right: 8),
                              color: AppColors.inputBorder,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    AuthTextField(
                      label: 'Password',
                      hintText: 'Enter your password',
                      controller: _passwordController,
                      isPassword: true,
                      prefixIcon: Icons.lock_outline_rounded,
                      validator: Validators.password,
                    ),
                    const SizedBox(height: 14),
                    AuthTextField(
                      label: 'Confirm password',
                      hintText: 'Confirm your password',
                      controller: _confirmPasswordController,
                      isPassword: true,
                      prefixIcon: Icons.lock_outline_rounded,
                      validator: (v) =>
                          Validators.confirmPassword(v, _passwordController.text),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: RichText(
                        text: TextSpan(
                          text: 'By signing up, you agree to our ',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.secondary,
                            height: 1.4,
                          ),
                          children: [
                            TextSpan(
                              text: 'Terms of Conditions',
                              style: TextStyle(
                                color: AppColors.button1background,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const TextSpan(text: ' and '),
                            TextSpan(
                              text: 'Privacy Policy.',
                              style: TextStyle(
                                color: AppColors.button1background,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    AuthButton(
                      label: 'Create account',
                      isLoading: isLoading,
                      onPressed: _onCreateAccount,
                    ),
                    const SizedBox(height: 18),
                    Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'Already have an account? ',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.secondary,
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              Navigator.pushReplacementNamed(context, '/patient_login');
                            },
                            child: const Text(
                              'Sign in',
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
