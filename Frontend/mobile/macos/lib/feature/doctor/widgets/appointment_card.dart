import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../data/models/appointment_model.dart';
import 'user_avatar.dart';

class AppointmentCard extends StatelessWidget {
  const AppointmentCard({
    super.key,
    required this.appointment,
    this.onMoreTap,
    this.onTap,
  });

  final AppointmentModel appointment;
  final VoidCallback? onMoreTap;
  final VoidCallback? onTap;

  bool get _isConfirmed => appointment.status == AppointmentStatus.confirmed;

  @override
  Widget build(BuildContext context) {
    const detailStyle = TextStyle(fontSize: 12, color: AppColors.dashText);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.dashBorder),
        ),
        child: Row(
          children: [
            UserAvatar(imagePath: appointment.imagePath, size: 52),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    appointment.patientName,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.dashTitle,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${appointment.type} · ${appointment.durationMinutes} min',
                    style: detailStyle,
                  ),
                  const SizedBox(height: 4),
                  Text(appointment.dateLabel, style: detailStyle),
                  const SizedBox(height: 6),
                  Text(
                    _isConfirmed ? 'Confirmed' : 'Pending',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: _isConfirmed
                          ? AppColors.dashAccent
                          : AppColors.dashPending,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: onMoreTap,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: const Icon(Icons.more_vert,
                  size: 20, color: AppColors.dashMuted),
            ),
          ],
        ),
      ),
    );
  }
}