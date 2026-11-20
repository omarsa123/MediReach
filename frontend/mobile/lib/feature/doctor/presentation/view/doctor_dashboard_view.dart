import 'package:flutter/material.dart';
import '../../data/models/appointment_model.dart';
import '../../widgets/appointment_card.dart';
import '../../widgets/dashboard_header.dart';
import '../../widgets/doctor_buttom_nav.dart';
import '../../widgets/overview_card.dart';
import '../../widgets/quick_action_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/welcome_banner.dart';

class DoctorDashboardView extends StatefulWidget {
  const DoctorDashboardView({super.key});

  @override
  State<DoctorDashboardView> createState() => _DoctorDashboardViewState();
}

class _DoctorDashboardViewState extends State<DoctorDashboardView> {
  int _currentIndex = 0;

  // داتا تجريبية، هتتبدل بداتا الـ API
  static const _appointments = [
    AppointmentModel(
      id: '1',
      patientName: 'Ahmed Mohamed',
      type: 'General consultation',
      durationMinutes: 30,
      dateLabel: '24 Jun 2026 · 10:00 AM',
      status: AppointmentStatus.confirmed,
      // imagePath: AppAssets.patient1,
    ),
    AppointmentModel(
      id: '2',
      patientName: 'Mona Hassan',
      type: 'General consultation',
      durationMinutes: 30,
      dateLabel: '24 Jun 2026 · 11:30 AM',
      status: AppointmentStatus.pending,
      // imagePath: AppAssets.patient2,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            const DashboardHeader(),
            const SizedBox(height: 24),
            const WelcomeBanner(
              doctorName: 'Dr. Sarah Johnson',
              // imagePath: AppAssets.doctorImage,
            ),
            const SizedBox(height: 24),
            const SectionHeader(title: 'Today’s overview'),
            const SizedBox(height: 14),
            const Row(
              children: [
                Expanded(
                  child: OverviewCard(
                    icon: Icons.calendar_month_outlined,
                    value: '12',
                    label: 'Appointments',
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: OverviewCard(
                    icon: Icons.people_outline,
                    value: '08',
                    label: 'Patients',
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: OverviewCard(
                    icon: Icons.account_balance_wallet_outlined,
                    value: '\$420',
                    label: 'Earnings',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SectionHeader(
              title: 'Upcoming appointments',
              actionLabel: 'See all',
              onActionTap: () {
                // TODO: navigate to appointments
              },
            ),
            const SizedBox(height: 14),
            for (final a in _appointments) ...[
              AppointmentCard(appointment: a, onMoreTap: () {}),
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
                    onTap: () {}, // TODO
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: QuickActionButton(
                    icon: Icons.people_outline,
                    label: 'My patients',
                    onTap: () {}, // TODO
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: DoctorBottomNav(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}