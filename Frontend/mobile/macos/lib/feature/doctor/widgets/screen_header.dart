import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// سهم رجوع + عنوان + جرس (نفس هيدر شاشات الدكتور)
class ScreenHeader extends StatelessWidget {
  const ScreenHeader({super.key, required this.title, this.showBack = true});

  final String title;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (showBack) ...[
          IconButton(
            onPressed: () => Navigator.maybePop(context),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            icon: const Icon(Icons.arrow_back,
                size: 24, color: AppColors.dashAccent),
          ),
          const SizedBox(width: 14),
        ],
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.dashTitle,
            ),
          ),
        ),
        IconButton(
          onPressed: () {}, // TODO: notifications
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          icon: const Icon(Icons.notifications_none,
              size: 26, color: AppColors.dashAccent),
        ),
      ],
    );
  }
}