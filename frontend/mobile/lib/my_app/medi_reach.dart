import 'package:flutter/material.dart';
import 'package:MediReach/feature/auth/presentation/view/doctor_login_view.dart';
import 'package:MediReach/feature/auth/presentation/view/doctor_registration_view.dart';
import 'package:MediReach/feature/auth/presentation/view/email_verification_view.dart';
import 'package:MediReach/feature/auth/presentation/view/forgot_password_view.dart';
import 'package:MediReach/feature/auth/presentation/view/onbarding_view.dart';
import 'package:MediReach/feature/auth/presentation/view/patient_login_view.dart';
import 'package:MediReach/feature/auth/presentation/view/patient_registration_view.dart';
import 'package:MediReach/feature/auth/presentation/view/reset_password_view.dart';
import 'package:MediReach/feature/auth/presentation/view/select_role.dart';
import 'package:MediReach/feature/auth/presentation/view/splash_view.dart';
import 'package:MediReach/feature/doctor/presentation/view/doctor_dashboard_view.dart';

class Medireach extends StatelessWidget {
  const Medireach({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: "Inter",
        scaffoldBackgroundColor: Colors.white,
      ),
      routes: {
        '/onboarding': (context) => const OnbardingView(),
        '/select_role': (context) => const SelectRole(),
        '/patient_register': (context) => const PatientRegistrationView(),
        '/doctor_register': (context) => const DoctorRegistrationView(),
        '/patient_login': (context) => const PatientLoginView(),
        '/doctor_login': (context) => const DoctorLoginView(),
        '/forgot_password': (context) => const ForgotPasswordView(),
        '/reset_password': (context) => const ResetPasswordView(),
        '/email_verification': (context) => const EmailVerificationView(),
        '/doctor_dashboard': (context) => const DoctorDashboardView(),
      },
      home: const SplashView(),
    );
  }
}