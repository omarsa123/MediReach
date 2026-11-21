import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:MediReach/core/services/deep_link_service.dart';
import 'package:MediReach/feature/auth/data/auth_repository.dart';
import 'package:MediReach/feature/auth/presentation/cubit/auth_cubit.dart';
import 'package:MediReach/feature/auth/presentation/view/auth_login_page.dart';
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

class Medireach extends StatefulWidget {
  const Medireach({super.key});

  @override
  State<Medireach> createState() => _MedireachState();
}

class _MedireachState extends State<Medireach> {
  /// مفتاح التنقل العام عشان نقدر نروح لأي شاشة من الـ Deep Link
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    DeepLinkService.instance.onLink = _handleDeepLink;
  }

  @override
  void dispose() {
    DeepLinkService.instance.onLink = null;
    super.dispose();
  }

  void _handleDeepLink(Uri uri) {
    final parsed = DeepLinkService.parse(uri);
    if (parsed == null) return;

    // نستنى الـ navigator يبقى جاهز
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

  /// استخراج query params من مسار زي /email_verification?token=xxx
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
        // دعم فتح اللينكات من الإيميل (deep link)
        onGenerateRoute: (settings) {
          final name = settings.name ?? '';
          final query = _parseQuery(name);
          final path = name.split('?').first;

          // تفعيل الإيميل من اللينك
          if (path == '/email_verification') {
            final token = query['token'] ??
                (settings.arguments is Map
                    ? (settings.arguments as Map)['token']?.toString()
                    : settings.arguments is String
                        ? settings.arguments as String
                        : null);
            final email = query['email'] ??
                (settings.arguments is Map
                    ? (settings.arguments as Map)['email']?.toString()
                    : settings.arguments is String &&
                            !(settings.arguments as String).contains('.')
                        ? settings.arguments as String
                        : null);
            return MaterialPageRoute(
              settings: RouteSettings(
                name: path,
                arguments: {
                  if (token != null) 'token': token,
                  if (email != null) 'email': email,
                },
              ),
              builder: (_) => EmailVerificationView(email: email),
            );
          }

          // إعادة تعيين كلمة المرور من اللينك
          if (path == '/reset_password') {
            final token = query['token'] ??
                (settings.arguments is Map
                    ? (settings.arguments as Map)['token']?.toString()
                    : settings.arguments is String
                        ? settings.arguments as String
                        : null);
            return MaterialPageRoute(
              settings: RouteSettings(
                name: path,
                arguments:
                    token != null ? {'token': token} : settings.arguments,
              ),
              builder: (_) => ResetPasswordView(token: token),
            );
          }

          // باقي الـ routes العادية
          final routes = <String, WidgetBuilder>{
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
            '/auth_login': (_) => const AuthLoginPage(),
          };

          final builder = routes[path];
          if (builder != null) {
            return MaterialPageRoute(
              settings: settings,
              builder: builder,
            );
          }
          return null;
        },
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
          '/auth_login': (context) => const AuthLoginPage(),
        },
        home: const SplashView(),
      ),
    );
  }
}
