import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import './my_app/medi_reach.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://dnsmjimhyqhqmgpfkdnf.supabase.co',
    publishableKey: 'sb_publishable_jxs-8BPsLRbxQ94I-potBg_ampCpD6f',
  );

  runApp(const Medireach());
}
