import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../data/models/patient_details_model.dart';

/// سطر زيارة سابقة (أيقونة + التاريخ + سبب الزيارة)
class VisitTile extends StatelessWidget {
  const VisitTile({super.key, required this.visit, this.onTap});

  final PatientVisit visit;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.assignment_outlined,
                size: 22, color: AppColors.dashAccent),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    visit.dateLabel,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.dashNavLabel),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    visit.title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.dashTitle,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}