import 'package:flutter/material.dart';
import '../../widgets/auth_role_tab_selector.dart';
import 'patient_login_view.dart';

class DoctorLoginView extends StatelessWidget {
  const DoctorLoginView({super.key});

  @override
  Widget build(BuildContext context) {
    return const PatientLoginView(
      initialRole: AuthRole.doctor,
    );
  }
}
