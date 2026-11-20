import 'package:MediReach/core/constants/app_assets.dart';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class DashboardHeader extends StatelessWidget {
  const DashboardHeader({super.key, this.onBellTap});

  final VoidCallback? onBellTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Image.asset(
          AppAssets.imgPath + "icon.png",
          width: 24,
          height: 24,
          fit: BoxFit.contain,
          color: AppColors.dashAccent, 
        ),
        const SizedBox(width: 10),
        const Text(
          'Dashboard',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.dashTitle,
          ),
        ),
        const Spacer(),
        IconButton(
          onPressed: onBellTap,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          icon: const Icon(Icons.notifications_none,
              size: 26, color: AppColors.dashAccent),
        ),
      ],
    );
  }
}