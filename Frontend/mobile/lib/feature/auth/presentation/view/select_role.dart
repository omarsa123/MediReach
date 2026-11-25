import 'package:flutter/material.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/user_preferences.dart';
import '../../widgets/feature_tag.dart';
import '../../widgets/primary_gradient_button.dart';
import '../../widgets/role_card.dart';

/// نوع الحساب - محفوظ في الـ storage وهيتبعت للـ backend
enum AccountType { patient, provider }

class SelectRole extends StatefulWidget {
  const SelectRole({super.key});

  @override
  State<SelectRole> createState() => _SelectRoleState();
}

class _SelectRoleState extends State<SelectRole> {
  AccountType _selected = AccountType.patient;

  @override
  void initState() {
    super.initState();
    _loadSavedRole();
  }

  Future<void> _loadSavedRole() async {
    final savedRole = await UserPreferences.getRole();
    if (savedRole != null && mounted) {
      setState(() {
        if (savedRole == AccountType.provider.name || savedRole == 'doctor') {
          _selected = AccountType.provider;
        } else {
          _selected = AccountType.patient;
        }
      });
    }
  }

  Future<void> _onContinue() async {
    await UserPreferences.saveRole(_selected.name);

    if (!mounted) return;

    if (_selected == AccountType.patient) {
      Navigator.pushReplacementNamed(context, '/patient_register');
    } else {
      Navigator.pushReplacementNamed(context, '/doctor_register');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 24),
                const Text(
                  'How will you use Medicare?',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Personalize your care experience. Choose the account type that best matches your daily needs.',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: AppColors.secondary,
                  ),
                ),
                const SizedBox(height: 20),
                RoleCard(
                  iconPath: AppAssets.userIcon,
                  iconColor: const Color(0xFF047857),
                  title: 'Patient',
                  badge: 'PERSONAL CARE',
                  subtitle: 'Individual & family wellness',
                  description:
                      'Find doctors, schedule virtual or clinic visits, and manage all your prescriptions in one place.',
                  tags: const [
                    FeatureTag('Instant Booking', Color(0xFF10B981)),
                    FeatureTag('Health Records', Color(0xFF14B8A6)),
                    FeatureTag('e-Prescriptions', Color(0xFF0EA5E9)),
                  ],
                  selected: _selected == AccountType.patient,
                  onTap: () => setState(() => _selected = AccountType.patient),
                ),
                const SizedBox(height: 16),
                RoleCard(
                  iconPath: AppAssets.stethoscopeIcon,
                  iconColor: const Color(0xFF047857),
                  title: 'Doctor / Provider',
                  badge: 'PRACTICE',
                  subtitle: 'Clinical practice & telehealth',
                  description:
                      'Manage your patient appointments, conduct encrypted video visits, and handle electronic charting with ease.',
                  tags: const [
                    FeatureTag('Practice Suite', Color(0xFF10B981)),
                    FeatureTag('HD Telehealth', Color(0xFF0EA5E9)),
                    FeatureTag('EHR Sync', Color(0xFF6366F1)),
                  ],
                  selected: _selected == AccountType.provider,
                  onTap: () => setState(() => _selected = AccountType.provider),
                ),
                const SizedBox(height: 28),
                PrimaryGradientButton(
                  label: 'Continue',
                  onPressed: _onContinue,
                ),
                const SizedBox(height: 24),
                const Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.verified_user,
                        size: 14,
                        color: Color(0xFF047857),
                      ),
                      SizedBox(width: 6),
                      Text(
                        '256-bit SSL • HIPAA Compliant & Private',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.secondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
