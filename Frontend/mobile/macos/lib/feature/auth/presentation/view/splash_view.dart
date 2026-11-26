
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_fonts.dart';
import '../../../../core/services/user_preferences.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';

class SplashView extends StatefulWidget {
  const SplashView({super.key});

  @override
  State<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends State<SplashView> {
  @override
  void initState() {
    super.initState();
    navigateNext();
  }

  Future<void> navigateNext() async {
    final authCubit = context.read<AuthCubit>();

    // Restore user session
    try {
      await authCubit.restoreSession();
    } catch (e) {
      debugPrint('Session restoration failed: $e');
    }

    // Keep splash visible for 2 seconds
    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    final authState = authCubit.state;

    // 1. Check authenticated user
    if (authState is AuthAuthenticated) {
      final role = authState.user.role.toLowerCase().trim();

      if (role == 'provider') {
        Navigator.pushReplacementNamed(
          context,
          '/doctor_dashboard',
        );
      } else if (role == 'patient') {
        Navigator.pushReplacementNamed(
          context,
          '/patient_home',
        );
      } else {
        Navigator.pushReplacementNamed(
          context,
          '/select_role',
        );
      }

      return;
    }

    // Login is shared by every account type. Role selection happens only
    // when the user chooses Register from the login screen.
    final isVisited = await UserPreferences.isVisited();
    if (!mounted) return;

    if (!isVisited) {
      Navigator.pushReplacementNamed(context, '/onboarding');
    } else {
      Navigator.pushReplacementNamed(context, '/auth_login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          image: DecorationImage(
            image: AssetImage(
              "${AppAssets.imgPath}splash_background.png",
            ),
            fit: BoxFit.cover,
          ),
        ),
        height: double.infinity,
        width: double.infinity,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              "${AppAssets.imgPath}icon.png",
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Text(
                "MedReach",
                style: AppFonts.mainTitle,
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(
                top: 6.0,
                bottom: 14,
              ),
              child: Text(
                "Your health, our priority",
                style: AppFonts.smallSubTitle,
              ),
            ),
            Text(
              "Better care. Wherever you are.",
              style: AppFonts.subTitle,
            ),
          ],
        ),
      ),
    );
  }
}
