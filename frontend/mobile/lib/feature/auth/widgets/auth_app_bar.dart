import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class AuthAppBar extends StatelessWidget implements PreferredSizeWidget {
  const AuthAppBar({
    super.key,
    this.title,
    this.onBack,
    this.showBack = true,
    this.showTrailing = true,
    this.trailing,
  });

  final String? title;
  final VoidCallback? onBack;
  final bool showBack;
  final bool showTrailing;
  final Widget? trailing;

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            Expanded(
              child: title != null
                  ? Text(
                      title!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                        letterSpacing: 0.3,
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
            if (showTrailing)
              trailing ??
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.inputBorder, width: 1.2),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.person_outline_rounded,
                        size: 18,
                        color: AppColors.secondary,
                      ),
                    ),
                  )
            else
              const SizedBox(width: 40),
          ],
        ),
      ),
    );
  }
}
