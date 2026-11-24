import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:medireach/feature/auth/presentation/view/new_password_view.dart';
import 'package:medireach/feature/patient/presentation/view/patient_home_view.dart';

import '../core/services/deep_link_service.dart';
import '../core/services/user_preferences.dart';
import '../feature/auth/data/auth_repository.dart';
import '../feature/auth/presentation/cubit/auth_cubit.dart';
import '../feature/auth/presentation/cubit/auth_state.dart';
import '../feature/auth/presentation/view/auth_login_page.dart';
import '../feature/auth/widgets/auth_snack_bar.dart';
import '../feature/auth/presentation/view/doctor_registration_view.dart';
import '../feature/auth/presentation/view/email_verification_view.dart';
import '../feature/auth/presentation/view/forgot_password_view.dart';
import '../feature/auth/presentation/view/onbarding_view.dart';
import '../feature/auth/presentation/view/patient_login_view.dart';
import '../feature/auth/presentation/view/patient_registration_view.dart';
import '../feature/auth/presentation/view/reset_password_view.dart';
import '../feature/auth/presentation/view/select_role.dart';
import '../feature/auth/presentation/view/splash_view.dart';
import '../feature/doctor/presentation/view/doctor_dashboard_view.dart';

class Medireach extends StatefulWidget {
  const Medireach({super.key});

  @override
  State<Medireach> createState() => _MedireachState();
}

class _MedireachState extends State<Medireach> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();

    // Register the callback BEFORE asking app_links for the initial link.
    DeepLinkService.instance.onLink = _handleDeepLink;
    unawaited(DeepLinkService.instance.init());
  }

  @override
  void dispose() {
    DeepLinkService.instance.onLink = null;
    DeepLinkService.instance.dispose();
    super.dispose();
  }

  void _handleDeepLink(Uri uri) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      if (DeepLinkService.isGoogleCallback(uri)) {
        unawaited(_completeGoogleSignIn(uri));
        return;
      }

      final parsed = DeepLinkService.parse(uri);
      if (parsed == null) return;

      _navigatorKey.currentState?.pushNamedAndRemoveUntil(
        parsed.routeName,
        (route) => route.isFirst,
        arguments: parsed.arguments.isEmpty ? null : parsed.arguments,
      );
    });
  }

  Future<void> _completeGoogleSignIn(Uri uri) async {
    final navigator = _navigatorKey.currentState;
    final navContext = _navigatorKey.currentContext;
    if (navigator == null || navContext == null) return;

    final pending = await UserPreferences.getPendingGoogleLogin();
    final expectedRole = (pending['role'] ?? 'patient').toString();
    final rememberMe = pending['rememberMe'] == true;
    final parameters = DeepLinkService.extractOAuthParameters(uri);

    final oauthError = parameters['error_description'] ?? parameters['error'];
    final accessToken = parameters['access_token'] ?? '';
    final refreshToken = parameters['refresh_token'] ?? '';

    if (oauthError != null && oauthError.isNotEmpty) {
      await UserPreferences.clearPendingGoogleLogin();
      _returnToLoginWithMessage(
        Uri.decodeComponent(oauthError.replaceAll('+', ' ')),
      );
      return;
    }

    if (accessToken.isEmpty || refreshToken.isEmpty) {
      await UserPreferences.clearPendingGoogleLogin();
      _returnToLoginWithMessage(
        'Google did not return a valid authentication session. Please try again.',
      );
      return;
    }

    final authCubit = navContext.read<AuthCubit>();
    final user = await authCubit.completeGoogleLogin(
      accessToken: accessToken,
      refreshToken: refreshToken,
      expectedRole: expectedRole,
      rememberMe: rememberMe,
    );

    await UserPreferences.clearPendingGoogleLogin();

    if (!mounted) return;

    if (user != null) {
      final destination = user.isDoctor ? '/doctor_dashboard' : '/patient_home';
      navigator.pushNamedAndRemoveUntil(destination, (route) => false);
      return;
    }

    final currentState = authCubit.state;
    final message = currentState is AuthError
        ? currentState.message
        : 'Google sign-in failed. Please try again.';
    _returnToLoginWithMessage(message);
  }

  void _returnToLoginWithMessage(String message) {
    _navigatorKey.currentState?.pushNamedAndRemoveUntil(
      '/auth_login',
      (route) => false,
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final context = _navigatorKey.currentContext;
      if (context == null) return;
      AuthSnackBar.show(
        context,
        message,
        type: AuthSnackBarType.error,
      );
    });
  }

  static Map<String, String> _parseQuery(String? name) {
    if (name == null || !name.contains('?')) return {};
    final uri = Uri.tryParse(name.startsWith('/') ? 'app://$name' : name);
    return uri?.queryParameters ?? {};
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider<AuthCubit>(
      create: (_) => AuthCubit(AuthRepository()),
      child: MaterialApp(
        navigatorKey: _navigatorKey,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          fontFamily: 'Inter',
          scaffoldBackgroundColor: Colors.white,
        ),
        onGenerateRoute: (settings) {
          final name = settings.name ?? '';
          final query = _parseQuery(name);
          final path = name.split('?').first;

          if (path == '/email_verification') {
            final email = query['email'] ??
                (settings.arguments is Map
                    ? (settings.arguments as Map)['email']?.toString()
                    : settings.arguments is String
                        ? settings.arguments as String
                        : null);
            return MaterialPageRoute(
              settings: RouteSettings(name: path, arguments: {'email': email}),
              builder: (_) => EmailVerificationView(email: email),
            );
          }

          if (path == '/reset_password') {
            final email = query['email'] ??
                (settings.arguments is Map
                    ? (settings.arguments as Map)['email']?.toString()
                    : null);
            return MaterialPageRoute(
              settings: RouteSettings(name: path, arguments: {'email': email}),
              builder: (_) => ResetPasswordView(email: email),
            );
          }

          final routes = <String, WidgetBuilder>{
            '/onboarding': (_) => const OnbardingView(),
            '/select_role': (_) => const SelectRole(),
            '/patient_register': (_) => const PatientRegistrationView(),
            '/doctor_register': (_) => const DoctorRegistrationView(),
            '/provider_register': (_) => const DoctorRegistrationView(),
            '/patient_login': (_) => const PatientLoginView(),
            '/doctor_login': (_) => const PatientLoginView(),
            '/provider_login': (_) => const PatientLoginView(),
            '/forgot_password': (_) => const ForgotPasswordView(),
            '/reset_password': (_) => const ResetPasswordView(),
            '/email_verification': (_) => const EmailVerificationView(),
            '/doctor_dashboard': (_) => const DoctorDashboardView(),
            '/auth_login': (_) => const AuthLoginPage(),
            '/patient_home': (_) => PatientHomeView(),
            '/new_password': (context) {
  final args = ModalRoute.of(context)?.settings.arguments;

  if (args is! Map ||
      args['email'] == null ||
      args['otp'] == null) {
    return const Scaffold(
      body: Center(
        child: Text('Invalid password reset session'),
      ),
    );
  }

  return NewPasswordView(
    email: args['email'].toString(),
    otp: args['otp'].toString(),
  );
},
          };

          final builder = routes[path];
          if (builder != null) {
            return MaterialPageRoute(settings: settings, builder: builder);
          }
          return null;
        },
        routes: {
          '/onboarding': (context) => const OnbardingView(),
          '/select_role': (context) => const SelectRole(),
          '/patient_register': (context) => const PatientRegistrationView(),
          '/doctor_register': (context) => const DoctorRegistrationView(),
          '/provider_register': (context) => const DoctorRegistrationView(),
          '/patient_login': (context) => const PatientLoginView(),
          '/doctor_login': (context) => const PatientLoginView(),
          '/provider_login': (context) => const PatientLoginView(),
          '/forgot_password': (context) => const ForgotPasswordView(),
          '/reset_password': (context) => const ResetPasswordView(),
          '/email_verification': (context) => const EmailVerificationView(),
          '/doctor_dashboard': (context) => const DoctorDashboardView(),
          '/auth_login': (context) => const AuthLoginPage(),
        },
        home: const SplashView(),
      ),
    );
  }
}
