import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import 'user_avatar.dart';

class PatientInfoCard extends StatelessWidget {
  const PatientInfoCard({
    super.key,
    required this.name,
    required this.gender,
    required this.age,
    required this.bloodType,
    required this.patientCode,
    this.imagePath,
  });

  final String name;
  final String gender;
  final int age;
  final String bloodType;
  final String patientCode;
  final String? imagePath;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.dashPatientBg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        children: [
          UserAvatar(imagePath: imagePath, size: 56),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.dashTitle,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$gender · $age years old · Blood type $bloodType',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.dashLabel),
                ),
                const SizedBox(height: 4),
                Text(
                  'Patient ID: $patientCode',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.dashAccent,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}