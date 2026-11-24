import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import './my_app/medi_reach.dart';
import './core/services/deep_link_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://dnsmjimhyqhqmgpfkdnf.supabase.co',
    publishableKey: 'sb_publishable_jxs-8BPsLRbxQ94I-potBg_ampCpD6f',
  );

  // تهيئة Deep Links قبل تشغيل التطبيق
  await DeepLinkService.instance.init();

  runApp(const Medireach());
}
