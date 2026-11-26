import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// أيقونة + label صغير + القيمة (Appointment date / Time / Type)
class DetailInfoRow extends StatelessWidget {
  const DetailInfoRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 22, color: AppColors.dashAccent),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.dashNavLabel),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.dashTitle,
              ),
            ),
          ],
        ),
      ],
    );
  }
}