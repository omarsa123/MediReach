import 'package:flutter/material.dart';
import 'patient_login_view.dart';

/// Single login entry point shared by every account role.
class AuthLoginPage extends StatelessWidget {
  const AuthLoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const PatientLoginView();
  }
}
