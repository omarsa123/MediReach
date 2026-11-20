import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// صورة دايرية، ولو الصورة مش موجودة بيظهر أيقونة بدالها
class UserAvatar extends StatelessWidget {
  const UserAvatar({super.key, this.imagePath, this.size = 52});

  final String? imagePath;
  final double size;

  @override
  Widget build(BuildContext context) {
    final fallback = Container(
      color: AppColors.dashActionBg,
      child: Icon(Icons.person, size: size * 0.55, color: AppColors.dashAccent),
    );

    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: imagePath == null
            ? fallback
            : Image.asset(
                imagePath!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => fallback,
              ),
      ),
    );
  }
}