import 'package:flutter/material.dart';
import '../../../../feature/doctor/data/models/appointment_details_model.dart';
import '../../../../feature/doctor/data/models/patient_details_model.dart';
import '../../../../feature/doctor/presentation/view/doctor_appointment_details_view.dart';
import '../../data/models/appointment_model.dart';
import '../../widgets/appointment_card.dart';
import '../../widgets/dashboard_header.dart';
import '../../widgets/overview_card.dart';
import '../../widgets/quick_action_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/welcome_banner.dart';

class DoctorDashboardView extends StatefulWidget {
  const DoctorDashboardView({
    super.key,
    this.doctorName = '',
    this.doctorImagePath,
    this.appointments = const [],
    this.appointmentsCount = 0,
    this.patientsCount = 0,
    this.earningsLabel = '\$0',
    this.onSeeAllAppointments,
    this.onOpenAppointmentsTab,
    this.onOpenPatientsTab,
    this.onSelectPatient,
    this.onAppointmentUpdated,
  });

  final String doctorName;
  final String? doctorImagePath;
  final List<AppointmentModel> appointments;
  final int appointmentsCount;
  final int patientsCount;
  final String earningsLabel;
  final VoidCallback? onSeeAllAppointments;
  final VoidCallback? onOpenAppointmentsTab;
  final VoidCallback? onOpenPatientsTab;
  final ValueChanged<PatientDetailsModel>? onSelectPatient;
  final ValueChanged<AppointmentModel>? onAppointmentUpdated;

  @override
  State<DoctorDashboardView> createState() => _DoctorDashboardViewState();
}

class _DoctorDashboardViewState extends State<DoctorDashboardView> {
  Future<void> _openAppointment(AppointmentModel appt) async {
    // TODO: اربطها بـ GET /api/v1/appointments/${appt.id}
    final details = AppointmentDetailsModel.fromAppointmentAndJson(
      appt,
      const {},
    );

    final updated = await Navigator.push<AppointmentDetailsModel>(
      context,
      MaterialPageRoute(
        builder: (_) => DoctorAppointmentDetailsView(
          details: details,
          onViewPatient: widget.onSelectPatient,
        ),
      ),
    );

    if (updated != null && mounted) {
      widget.onAppointmentUpdated?.call(appt.copyWith(status: updated.status));
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayName = widget.doctorName.trim().isNotEmpty
        ? widget.doctorName.trim()
        : 'Doctor';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            const DashboardHeader(),
            const SizedBox(height: 24),
            WelcomeBanner(doctorName: displayName),
            const SizedBox(height: 24),
            const SectionHeader(title: 'Today’s overview'),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OverviewCard(
                    icon: Icons.calendar_month_outlined,
                    value: '${widget.appointmentsCount}',
                    label: 'Appointments',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OverviewCard(
                    icon: Icons.people_outline,
                    value: '${widget.patientsCount}',
                    label: 'Patients',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OverviewCard(
                    icon: Icons.account_balance_wallet_outlined,
                    value: widget.earningsLabel,
                    label: 'Earnings',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SectionHeader(
              title: 'Upcoming appointments',
              actionLabel: 'See all',
              onActionTap:
                  widget.onSeeAllAppointments ?? widget.onOpenAppointmentsTab,
            ),
            const SizedBox(height: 14),
            if (widget.appointments.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'No upcoming appointments',
                  style: TextStyle(fontSize: 13),
                ),
              )
            else
              for (final a in widget.appointments) ...[
                AppointmentCard(
                  appointment: a,
                  onMoreTap: () => _openAppointment(a),
                ),
                const SizedBox(height: 14),
              ],
            const SizedBox(height: 10),
            const SectionHeader(title: 'Quick actions'),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: QuickActionButton(
                    icon: Icons.calendar_today_outlined,
                    label: 'Availability',
                    onTap: widget.onOpenAppointmentsTab ?? () {},
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: QuickActionButton(
                    icon: Icons.people_outline,
                    label: 'My patients',
                    onTap: widget.onOpenPatientsTab ?? () {},
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
