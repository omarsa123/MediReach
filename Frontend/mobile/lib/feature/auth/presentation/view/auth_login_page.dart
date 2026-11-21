import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/auth_repository.dart';
import '../cubit/auth_cubit.dart';
import '../cubit/auth_state.dart';
import 'patient_login_view.dart';

class AuthLoginPage extends StatelessWidget {
  const AuthLoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AuthCubit(AuthRepository()),
      child: BlocListener<AuthCubit, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            final role = state.user.role;
            if (role == 'provider' || role == 'doctor') {
              Navigator.pushReplacementNamed(context, '/doctor_dashboard');
            } else {
              Navigator.pushReplacementNamed(context, '/patient_login');
            }
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        child: const PatientLoginView(),
      ),
    );
  }
}
