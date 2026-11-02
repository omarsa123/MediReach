import 'package:flutter/material.dart';
import 'package:MediReach/feature/auth/presentation/view/onbarding_view.dart';
import 'package:MediReach/feature/auth/presentation/view/select_role.dart';
import 'package:MediReach/feature/auth/presentation/view/splash_view.dart';
import 'package:MediReach/feature/auth/widgets/onboarding_page.dart';

class Medireach extends StatelessWidget {
  const Medireach({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(
        fontFamily: "Inter",
        scaffoldBackgroundColor: Colors.white
      ),
      routes: {
        '/onboarding' :(context) => OnbardingView(),
        '/select_role'  :(context) => SelectRole()
      },
      home: SplashView()
    );
  }
}