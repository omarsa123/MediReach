import 'package:flutter/material.dart';
import '../../../../feature/doctor/data/models/patient_details_model.dart';
import '../../../../feature/doctor/presentation/view/doctor_patient_details_view.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/appointment_details_model.dart';
import '../../data/models/appointment_model.dart';
import '../../widgets/detail_info_row.dart';
import '../../widgets/filled_action_button.dart';
import '../../widgets/patient_info_card.dart';
import '../../widgets/status_chip.dart';

class DoctorAppointmentDetailsView extends StatefulWidget {
  const DoctorAppointmentDetailsView({
    super.key,
    required this.details,
    this.onViewPatient,
  });

  final AppointmentDetailsModel details;
  final ValueChanged<PatientDetailsModel>? onViewPatient;

  @override
  State<DoctorAppointmentDetailsView> createState() =>
      _DoctorAppointmentDetailsViewState();
}

class _DoctorAppointmentDetailsViewState
    extends State<DoctorAppointmentDetailsView> {
  late AppointmentDetailsModel _current = widget.details;

  void _updateStatus(AppointmentStatus next) {
    // TODO: استدعِ PATCH /api/v1/providers/appointments/${_current.id}/status بالحالة next.toApiStatus()
    setState(() {
      _current = _current.copyWith(status: next);
    });
  }

  void _onAccept() => _updateStatus(AppointmentStatus.confirmed);

  void _onDecline() => _updateStatus(AppointmentStatus.cancelled);

  void _onStartConsultation() {
    // TODO: افتح غرفة الكشف من GET /api/v1/providers/online-room أو /api/v1/medical/online-room/:providerId
  }

  void _openPatient() {
    final patientModel = PatientDetailsModel.fromAppointmentDetails(_current);
    if (widget.onViewPatient != null) {
      Navigator.pop(context, _current);
      widget.onViewPatient!(patientModel);
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => DoctorPatientDetailsView(patient: patientModel),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            _Header(onBack: () => Navigator.maybePop(context, _current)),
            const SizedBox(height: 20),
            InkWell(
              onTap: _openPatient,
              borderRadius: BorderRadius.circular(12),
              child: PatientInfoCard(
                name: _current.patientName,
                gender: _current.gender,
                age: _current.age,
                bloodType: _current.bloodType,
                patientCode: _current.patientCode,
                imagePath: _current.imagePath,
              ),
            ),
            const SizedBox(height: 14),
            Align(
              alignment: Alignment.centerLeft,
              child: StatusChip(status: _current.status),
            ),
            const SizedBox(height: 22),
            DetailInfoRow(
              icon: Icons.calendar_today_outlined,
              label: 'Appointment date',
              value: _current.dateLabel,
            ),
            const SizedBox(height: 26),
            DetailInfoRow(
              icon: Icons.access_time,
              label: 'Time',
              value: _current.timeLabel,
            ),
            const SizedBox(height: 26),
            DetailInfoRow(
              icon: Icons.videocam_outlined,
              label: 'Type',
              value: _current.consultationType,
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
            _InfoSection(title: 'Reason for visit', body: _current.reason),
            const SizedBox(height: 20),
            _InfoSection(title: 'Patient notes', body: _current.notes),
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
            fontSize: 13,
            height: 1.5,
            color: AppColors.dashMuted,
          ),
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
          icon: const Icon(
            Icons.arrow_back,
            size: 24,
            color: AppColors.dashAccent,
          ),
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
          icon: const Icon(
            Icons.notifications_none,
            size: 26,
            color: AppColors.dashAccent,
          ),
        ),
      ],
    );
  }
}
