import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../data/models/appointment_model.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final AppointmentStatus status;

  @override
  Widget build(BuildContext context) {
    final confirmed = status == AppointmentStatus.confirmed;
    final color = confirmed ? AppColors.dashAccent : AppColors.dashPending;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: confirmed ? AppColors.dashChipBg : const Color(0xFFFEF3DF),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        confirmed ? 'Confirmed' : 'Pending',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}