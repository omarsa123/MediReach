import 'dart:async';

import 'package:flutter/material.dart';
import 'package:MediReach/core/constants/app_assets.dart';
import 'package:MediReach/core/constants/app_fonts.dart';
import 'package:MediReach/core/services/user_preferences.dart';

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
    await Future.delayed(const Duration(seconds: 3));

    final isVisited = await UserPreferences.isVisited();
    final savedRole = await UserPreferences.getRole();

    if (!mounted) return;

    if (!isVisited) {
      Navigator.pushReplacementNamed(context, '/onboarding');
    } else if (savedRole != null) {
      if (savedRole == 'provider' || savedRole == 'doctor') {
        Navigator.pushReplacementNamed(context, '/doctor_login');
      } else {
        Navigator.pushReplacementNamed(context, '/patient_login');
      }
    } else {
      Navigator.pushReplacementNamed(context, '/select_role');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          image: DecorationImage(
            image: AssetImage("${AppAssets.imgPath}splash_background.png"),
            fit: BoxFit.cover,
          ),
        ),
        height: double.infinity,
        width: double.infinity,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset("${AppAssets.imgPath}icon.png"),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Text("MedReach", style: AppFonts.mainTitle),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6.0, bottom: 14),
              child: Text(
                "Your health, our priority",
                style: AppFonts.smallSubTitle,
              ),
            ),
            Text("Better care. Wherever you are.", style: AppFonts.subTitle),
          ],
        ),
      ),
    );
  }
}
