import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../widgets/auth_app_bar.dart';
import '../../widgets/auth_snack_bar.dart';
import '../../widgets/auth_button.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_text_field.dart';
import '../../widgets/provider_type_dropdown.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';

class DoctorRegistrationView extends StatefulWidget {
  final String? registrationToken;
  final String? googleEmail;
  final String? googleName;

  const DoctorRegistrationView({
    super.key,
    this.registrationToken,
    this.googleEmail,
    this.googleName,
  });

  @override
  State<DoctorRegistrationView> createState() => _DoctorRegistrationViewState();
}

class _DoctorRegistrationViewState extends State<DoctorRegistrationView> {
  final _formKey = GlobalKey<FormState>();

  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _licenseController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String _countryCode = '+20';
  bool get _isGoogleRegistration => widget.registrationToken != null;
  String? _selectedSpecialty;
  String _providerType = 'Doctor';

  File? _profileImage;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _fullNameController.text = widget.googleName ?? '';
    _emailController.text = widget.googleEmail ?? '';
  }

  static const List<String> _providerRoles = [
    'Doctor',
    'Nurse',
    'Physiotherapist',
    'Lab Technician',
    'Pharmacist',
    'Radiologist',
    'Dentist',
  ];

  static const Map<String, List<String>> _specialtiesByRole = {
    'Doctor': [
      'General Practitioner',
      'Cardiologist',
      'Dermatologist',
      'Pediatrician',
      'Neurologist',
      'Orthopedic Surgeon',
      'Psychiatrist',
      'Ophthalmologist',
      'Internal Medicine',
      'ENT Specialist',
      'Gynecologist',
      'Urologist',
      'Oncologist',
      'Endocrinologist',
    ],
    'Nurse': [
      'General Nursing',
      'Critical Care Nursing',
      'Pediatric Nursing',
      'Surgical Nursing',
      'Emergency Nursing',
      'Community Health Nursing',
      'Midwifery',
      'Oncology Nursing',
    ],
    'Physiotherapist': [
      'Musculoskeletal Physiotherapy',
      'Neurological Physiotherapy',
      'Pediatric Physiotherapy',
      'Sports Physiotherapy',
      'Cardiopulmonary Physiotherapy',
      'Geriatric Physiotherapy',
    ],
    'Lab Technician': [
      'Clinical Chemistry',
      'Hematology',
      'Microbiology',
      'Immunology',
      'Histopathology',
      'Molecular Diagnostics',
      'Blood Bank',
    ],
    'Pharmacist': [
      'Clinical Pharmacy',
      'Hospital Pharmacy',
      'Community Pharmacy',
      'Industrial Pharmacy',
      'Oncology Pharmacy',
    ],
    'Radiologist': [
      'Diagnostic Radiology',
      'Interventional Radiology',
      'Nuclear Medicine',
      'Ultrasound',
      'CT / MRI Specialist',
    ],
    'Dentist': [
      'General Dentistry',
      'Orthodontics',
      'Endodontics',
      'Periodontics',
      'Oral Surgery',
      'Pediatric Dentistry',
      'Prosthodontics',
    ],
  };

  List<String> get _currentSpecialties =>
      _specialtiesByRole[_providerType] ?? const [];

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _licenseController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final XFile? picked = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (picked != null && mounted) {
        setState(() => _profileImage = File(picked.path));
      }
    } catch (e) {
      if (!mounted) return;

      AuthSnackBar.show(
        context,
        'Could not pick image. Please try again.',
        type: AuthSnackBarType.error,
      );
    }
  }

  Future<void> _onCreateAccount() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    if (_selectedSpecialty == null) {
      AuthSnackBar.show(
        context,
        'Please select your specialty',
        type: AuthSnackBarType.warning,
      );
      return;
    }

    final cleanPhone = _phoneController.text.trim().replaceFirst(
      RegExp(r'^0+'),
      '',
    );

    final fullPhone = '$_countryCode$cleanPhone';

    String? base64Image;
    if (_profileImage != null) {
      final bytes = await _profileImage!.readAsBytes();
      base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';
    }

    if (!mounted) return;

    if (_isGoogleRegistration) {
      if (base64Image == null) {
        AuthSnackBar.show(context, 'Please add your profile photo', type: AuthSnackBarType.warning);
        return;
      }
      context.read<AuthCubit>().registerWithGoogle({
        'registrationToken': widget.registrationToken,
        'role': 'provider',
        'name': _fullNameController.text.trim(),
        'phone': fullPhone,
        'providerType': _providerType,
        'specialization': _selectedSpecialty!,
        'licenseNumber': _licenseController.text.trim(),
        'profileImageBase64': base64Image,
      });
    } else {
      context.read<AuthCubit>().registerDoctor(
        name: _fullNameController.text.trim(),
        email: _emailController.text.trim(),
        phone: fullPhone,
        password: _passwordController.text,
        specialization: _selectedSpecialty!,
        licenseNumber: _licenseController.text.trim(),
        providerType: _providerType,
        profileImagePath: base64Image,
      );
    }
  }

  void _onProviderTypeChanged(String? value) {
    if (value == null || value == _providerType) return;

    setState(() {
      _providerType = value;
      _selectedSpecialty = null;
    });
  }

  Widget _buildProfileImagePicker() {
    return Center(
      child: Column(
        children: [
          GestureDetector(
            onTap: _pickImage,
            child: Stack(
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFFF1F5F9),
                    border: Border.all(
                      color: AppColors.inputBorder,
                      width: 1.5,
                    ),
                    image: _profileImage != null
                        ? DecorationImage(
                            image: FileImage(_profileImage!),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: _profileImage == null
                      ? const Icon(
                          Icons.person_outline_rounded,
                          size: 42,
                          color: Color(0xFF94A3B8),
                        )
                      : null,
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.button1background,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(
                      Icons.camera_alt_rounded,
                      size: 16,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _profileImage == null
                ? 'Add profile photo'
                : 'Change profile photo',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.button1background,
            ),
          ),
        ],
      ),
    );
  }

  String get _nameHint {
    switch (_providerType) {
      case 'Nurse':
        return 'Nurse First Last name';
      case 'Physiotherapist':
        return 'Physio First Last name';
      case 'Lab Technician':
        return 'Technician First Last name';
      case 'Pharmacist':
        return 'Pharmacist First Last name';
      case 'Radiologist':
        return 'Radiologist First Last name';
      case 'Dentist':
        return 'Dr. First Last name';
      default:
        return 'Dr. First Last name';
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
        } else if (state is AuthGoogleRegistrationSuccess) {
          Navigator.pushNamedAndRemoveUntil(context, '/provider_login', (route) => false);
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) {
              AuthSnackBar.show(context, 'Your provider account is awaiting admin approval.', type: AuthSnackBarType.success);
            }
          });
        } else if (state is AuthAuthenticated) {
          Navigator.pushReplacementNamed(context, '/provider_login');
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
          appBar: const AuthAppBar(title: 'Provider Registration'),
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
                      'Join our network of healthcare providers.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.secondary,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 20),

                    _buildProfileImagePicker(),

                    const SizedBox(height: 20),

                    ProviderTypeDropdown(
                      roles: _providerRoles,
                      selectedRole: _providerType,
                      onChanged: _onProviderTypeChanged,
                    ),

                    const SizedBox(height: 14),

                    AuthTextField(
                      label: 'Full name',
                      hintText: _nameHint,
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
                      readOnly: _isGoogleRegistration,
                    ),

                    const SizedBox(height: 14),

                    AuthTextField(
                      label: 'Phone number',
                      hintText: 'Enter your phone number',
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      validator: (v) =>
                          Validators.phone(v, countryCode: _countryCode),
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
                                  DropdownMenuItem(
                                    value: '+20',
                                    child: Text('+20'),
                                  ),
                                  DropdownMenuItem(
                                    value: '+1',
                                    child: Text('+1'),
                                  ),
                                  DropdownMenuItem(
                                    value: '+966',
                                    child: Text('+966'),
                                  ),
                                  DropdownMenuItem(
                                    value: '+971',
                                    child: Text('+971'),
                                  ),
                                ],
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() {
                                      _countryCode = val;
                                    });
                                  }
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

                    ProviderTypeDropdown(
                      roles: _currentSpecialties,
                      selectedRole: _selectedSpecialty,
                      onChanged: (value) {
                        setState(() {
                          _selectedSpecialty = value;
                        });
                      },
                      label: 'Specialty',
                    ),

                    const SizedBox(height: 14),

                    AuthTextField(
                      label: 'Medical license number',
                      hintText: 'Enter license number',
                      controller: _licenseController,
                      prefixIcon: Icons.badge_outlined,
                      validator: (v) => v == null || v.trim().isEmpty
                          ? 'Please enter your license number'
                          : null,
                    ),

                    const SizedBox(height: 14),

                    if (!_isGoogleRegistration) ...[
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
                        validator: (v) => Validators.confirmPassword(v, _passwordController.text),
                      ),
                      const SizedBox(height: 16),
                    ],

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
                              Navigator.pushReplacementNamed(
                                context,
                                '/provider_login',
                              );
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
