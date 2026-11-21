import 'package:flutter/material.dart';
import 'package:MediReach/my_app/medi_reach.dart';
import 'package:MediReach/core/services/deep_link_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // تهيئة Deep Links قبل تشغيل التطبيق
  await DeepLinkService.instance.init();

  runApp(const Medireach());
}
