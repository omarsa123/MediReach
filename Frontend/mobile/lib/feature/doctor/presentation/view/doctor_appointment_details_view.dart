import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/appointment_details_model.dart';
import '../../widgets/detail_info_row.dart';
import '../../widgets/filled_action_button.dart';
import '../../widgets/patient_info_card.dart';
import '../../widgets/status_chip.dart';

class DoctorAppointmentDetailsView extends StatelessWidget {
  const DoctorAppointmentDetailsView({
    super.key,
    required this.details, // TODO: من الـ API
  });

  final AppointmentDetailsModel details;

  void _onAccept() {
    // TODO: API accept
  }

  void _onDecline() {
    // TODO: API decline
  }

  void _onStartConsultation() {
    // TODO: start video consultation
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            _Header(onBack: () => Navigator.maybePop(context)),
            const SizedBox(height: 20),
            PatientInfoCard(
              name: details.patientName,
              gender: details.gender,
              age: details.age,
              bloodType: details.bloodType,
              patientCode: details.patientCode,
              imagePath: details.imagePath,
            ),
            const SizedBox(height: 14),
            Align(
              alignment: Alignment.centerLeft,
              child: StatusChip(status: details.status),
            ),
            const SizedBox(height: 22),
            DetailInfoRow(
              icon: Icons.calendar_today_outlined,
              label: 'Appointment date',
              value: details.dateLabel,
            ),
            const SizedBox(height: 26),
            DetailInfoRow(
              icon: Icons.access_time,
              label: 'Time',
              value: details.timeLabel,
            ),
            const SizedBox(height: 26),
            DetailInfoRow(
              icon: Icons.videocam_outlined,
              label: 'Type',
              value: details.consultationType,
            ),
            const SizedBox(height: 26),
            Row(
              children: [
                Expanded(
                  child: FilledActionButton(
                    label: 'Accept',
                    onTap: _onAccept,
                    backgroundColor: AppColors.dashAccent,
                    foregroundColor: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledActionButton(
                    label: 'Decline',
                    onTap: _onDecline,
                    backgroundColor: AppColors.dashDangerBg,
                    foregroundColor: AppColors.dashDanger,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Divider(height: 1, color: AppColors.dashNavBorder),
            const SizedBox(height: 20),
            _InfoSection(title: 'Reason for visit', body: details.reason),
            const SizedBox(height: 20),
            _InfoSection(title: 'Patient notes', body: details.notes),
            const SizedBox(height: 20),
            FilledActionButton(
              label: 'Start consultation',
              icon: Icons.videocam_outlined,
              onTap: _onStartConsultation,
              backgroundColor: AppColors.dashActionBg,
              foregroundColor: AppColors.dashValue,
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: AppColors.dashTitle,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          body,
          style: const TextStyle(
              fontSize: 13, height: 1.5, color: AppColors.dashMuted),
        ),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: onBack,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          icon: const Icon(Icons.arrow_back,
              size: 24, color: AppColors.dashAccent),
        ),
        const SizedBox(width: 14),
        const Text(
          'Appointment details',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.dashTitle,
          ),
        ),
        const Spacer(),
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