import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/services/deep_link_service.dart';
import '../feature/auth/data/auth_repository.dart';
import '../feature/auth/presentation/cubit/auth_cubit.dart';
import '../feature/auth/presentation/view/auth_login_page.dart';
import '../feature/auth/presentation/view/doctor_login_view.dart';
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
import '../feature/patient/presentation/view/patient_home_view.dart';

class Medireach extends StatefulWidget {
  const Medireach({super.key});

  @override
  State<Medireach> createState() => _MedireachState();
}

class _MedireachState extends State<Medireach> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  StreamSubscription<AuthState>? _authSubscription;

  @override
  void initState() {
    super.initState();
    DeepLinkService.instance.onLink = _handleDeepLink;

    // مراقب حالة تسجيل الدخول
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((
      data,
    ) {
      final session = data.session;
      if (session != null && mounted) {
        final nav = _navigatorKey.currentState;
        if (nav != null) {
          debugPrint('Auth State Change: User logged in -> ${session.user.id}');
        }
      }
    });
  }

  @override
  void dispose() {
    DeepLinkService.instance.onLink = null;
    _authSubscription?.cancel();
    super.dispose();
  }

  void _handleDeepLink(Uri uri) {
    final parsed = DeepLinkService.parse(uri);
    if (parsed == null) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final nav = _navigatorKey.currentState;
      if (nav == null) return;

      nav.pushNamedAndRemoveUntil(
        parsed.routeName,
        (route) => route.isFirst,
        arguments: parsed.arguments.isEmpty ? null : parsed.arguments,
      );
    });
  }

  /// استخراج query params من مسار زي /email_verification?email=xxx
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
          fontFamily: "Inter",
          scaffoldBackgroundColor: Colors.white,
        ),
        onGenerateRoute: (settings) {
          final name = settings.name ?? '';
          final query = _parseQuery(name);
          final path = name.split('?').first;

          // التحقق من الإيميل
          if (path == '/email_verification') {
            final email =
                query['email'] ??
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

          // إعادة تعيين كلمة المرور
          if (path == '/reset_password') {
            final email =
                query['email'] ??
                (settings.arguments is Map
                    ? (settings.arguments as Map)['email']?.toString()
                    : null);
            return MaterialPageRoute(
              settings: RouteSettings(name: path, arguments: {'email': email}),
              builder: (_) => ResetPasswordView(email: email),
            );
          }

          // باقي الـ routes العادية
          final routes = <String, WidgetBuilder>{
            '/': (_) => const SplashView(),
            '/onboarding': (_) => const OnbardingView(),
            '/select_role': (_) => const SelectRole(),
            '/patient_register': (_) => const PatientRegistrationView(),
            '/doctor_register': (_) => const DoctorRegistrationView(),
            '/patient_login': (_) => const PatientLoginView(),
            '/doctor_login': (_) => const DoctorLoginView(),
            '/forgot_password': (_) => const ForgotPasswordView(),
            '/reset_password': (_) => const ResetPasswordView(),
            '/email_verification': (_) => const EmailVerificationView(),
            '/doctor_dashboard': (_) => const DoctorDashboardView(),
            '/patient_home': (_) => const PatientHomeView(),
            '/auth_login': (_) => const AuthLoginPage(),
          };

          final builder = routes[path];
          if (builder != null) {
            return MaterialPageRoute(settings: settings, builder: builder);
          }
          return null;
        },
        routes: {
          '/': (context) => const SplashView(),
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
          '/auth_login': (context) => const AuthLoginPage(),
          '/patient_home': (context) => const PatientHomeView(),
        },
      ),
    );
  }
}
