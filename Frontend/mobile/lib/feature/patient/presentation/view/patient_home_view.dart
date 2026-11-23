import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../feature/auth/presentation/cubit/auth_cubit.dart';
import '../../../../feature/auth/presentation/cubit/auth_state.dart';

/// Temporary landing page until the full patient dashboard is added.
class PatientHomeView extends StatelessWidget {
  const PatientHomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthUnauthenticated) {
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/patient_login',
            (r) => false,
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('MedReach - Patient'),
          actions: [
            IconButton(
              tooltip: 'Sign out',
              onPressed: () => context.read<AuthCubit>().logout(),
              icon: const Icon(Icons.logout),
            ),
          ],
        ),
        body: Center(
          child: BlocBuilder<AuthCubit, AuthState>(
            builder: (context, state) {
              final name = state is AuthAuthenticated
                  ? state.user.name
                  : 'Patient';
              return Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Welcome, $name\nYour account is signed in successfully.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
