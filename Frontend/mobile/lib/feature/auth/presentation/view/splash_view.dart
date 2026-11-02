import 'dart:async';

import 'package:flutter/material.dart';
import 'package:MediReach/core/constants/app_assets.dart';
import 'package:MediReach/core/constants/app_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SplashView extends StatefulWidget {
  const SplashView({super.key});

  @override
  State<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends State<SplashView> {
  SharedPreferences? sp;
  @override
  void initState() {
    super.initState();
    navigateNext();
  }

   Future<void> navigateNext() async {
    await Future.delayed(const Duration(seconds: 3));

    final sp = await SharedPreferences.getInstance();
    final isVisited = sp.getBool("isVisit") ?? false;

    if (!mounted) return;

    if (isVisited) {
      Navigator.pushReplacementNamed(context, '/select_role');
    } else {
      Navigator.pushReplacementNamed(context, '/onboarding');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          image: DecorationImage(
            image: AssetImage("${AppAssets.imgPath}splash_background.png"),
            fit: .cover,
          ),
        ),
        height: double.infinity,
        width: double.infinity,
        child: Column(
          mainAxisAlignment: .center,
          children: [
            Image.asset("${AppAssets.imgPath}icon.png"),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Text("MediReach", style: AppFonts.mainTitle),
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
