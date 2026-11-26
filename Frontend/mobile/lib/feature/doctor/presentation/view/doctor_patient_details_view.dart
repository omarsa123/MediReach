import 'package:flutter/material.dart';
import 'package:medireach/feature/doctor/widgets/screen_header.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/patient_details_model.dart';
import '../../widgets/detail_info_row.dart';
import '../../widgets/filled_action_button.dart';
import '../../widgets/patient_info_card.dart';
import '../../widgets/section_header.dart';
import '../../widgets/visit_tile.dart';

class DoctorPatientDetailsView extends StatelessWidget {
  const DoctorPatientDetailsView({
    super.key,
    required this.patient,
    this.onViewRecords,
    this.onWritePrescription,
  });

  final PatientDetailsModel patient;
  final ValueChanged<PatientDetailsModel>? onViewRecords;
  final ValueChanged<PatientDetailsModel>? onWritePrescription;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                children: [
                  const ScreenHeader(title: 'Patient details'),
                  const SizedBox(height: 20),
                  PatientInfoCard(
                    name: patient.name,
                    gender: patient.gender,
                    age: patient.age,
                    bloodType: patient.bloodType,
                    patientCode: patient.patientCode,
                    imagePath: patient.imagePath,
                  ),
                  const SizedBox(height: 22),
                  const SectionHeader(title: 'Personal information'),
                  const SizedBox(height: 18),
                  DetailInfoRow(
                    icon: Icons.phone_outlined,
                    label: 'Contact',
                    value: patient.phone,
                  ),
                  const SizedBox(height: 26),
                  DetailInfoRow(
                    icon: Icons.mail_outline,
                    label: 'Email',
                    value: patient.email,
                  ),
                  const SizedBox(height: 26),
                  DetailInfoRow(
                    icon: Icons.calendar_today_outlined,
                    label: 'Date of birth',
                    value: patient.dateOfBirth,
                  ),
                  const SizedBox(height: 22),
                  const Divider(height: 1, color: AppColors.dashNavBorder),
                  const SizedBox(height: 22),
                  const SectionHeader(title: 'Medical history'),
                  const SizedBox(height: 12),
                  if (patient.medicalHistory.isEmpty)
                    const Text(
                      'No medical history recorded',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.dashMuted,
                      ),
                    )
                  else
                    for (final item in patient.medicalHistory)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text(
                          item,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.dashMuted,
                          ),
                        ),
                      ),
                  const SizedBox(height: 12),
                  const SectionHeader(title: 'Recent visits'),
                  const SizedBox(height: 12),
                  if (patient.recentVisits.isEmpty)
                    const Text(
                      'No previous visits',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.dashMuted,
                      ),
                    )
                  else
                    for (final v in patient.recentVisits) VisitTile(visit: v),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FilledActionButton(
                    label: 'View medical records',
                    onTap: () => onViewRecords?.call(patient),
                    backgroundColor: AppColors.dashActionBg,
                    foregroundColor: AppColors.dashValue,
                  ),
                  const SizedBox(height: 12),
                  FilledActionButton(
                    label: 'Write prescription',
                    onTap: () => onWritePrescription?.call(patient),
                    backgroundColor: AppColors.dashAccent,
                    foregroundColor: Colors.white,
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
