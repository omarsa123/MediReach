
import 'package:flutter/material.dart';
import 'package:medireach/feature/doctor/data/models/appointment_details_model.dart';
import 'package:medireach/feature/doctor/presentation/view/doctor_appointment_details_view.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/appointment_model.dart';
import '../../widgets/appointment_card.dart';
import '../../widgets/appointments_tab_bar.dart';

class DoctorAppointmentsView extends StatefulWidget {
  const DoctorAppointmentsView({super.key, this.onBack});

  /// الرجوع للـ Home (الشاشة جوه تاب، فمينفعش Navigator.pop)
  final VoidCallback? onBack;

  @override
  State<DoctorAppointmentsView> createState() => _DoctorAppointmentsViewState();
}

class _DoctorAppointmentsViewState extends State<DoctorAppointmentsView> {
  int _tabIndex = 0;

  static const _tabs = ['Today', 'Upcoming', 'Completed'];

  static const _today = [
    AppointmentModel(
      id: '1',
      patientName: 'Ahmed Mohamed',
      type: 'General consultation',
      durationMinutes: 30,
      dateLabel: '24 Jun 2026 · 10:00 AM',
      status: AppointmentStatus.confirmed,
    ),
    AppointmentModel(
      id: '2',
      patientName: 'Mona Hassan',
      type: 'General consultation',
      durationMinutes: 30,
      dateLabel: '24 Jun 2026 · 11:30 AM',
      status: AppointmentStatus.pending,
    ),
    AppointmentModel(
      id: '3',
      patientName: 'Omar Khaled',
      type: 'General consultation',
      durationMinutes: 30,
      dateLabel: '24 Jun 2026 · 01:00 PM',
      status: AppointmentStatus.confirmed,
    ),
    AppointmentModel(
      id: '4',
      patientName: 'Nour Ahmed',
      type: 'General consultation',
      durationMinutes: 30,
      dateLabel: '24 Jun 2026 · 02:30 PM',
      status: AppointmentStatus.confirmed,
    ),
  ];

  List<AppointmentModel> get _current =>
      _tabIndex == 0 ? _today : const []; // TODO: Upcoming / Completed

  @override
  Widget build(BuildContext context) {
    final items = _current;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Header(onBack: widget.onBack),
              const SizedBox(height: 20),
              AppointmentsTabBar(
                labels: _tabs,
                selectedIndex: _tabIndex,
                onChanged: (i) => setState(() => _tabIndex = i),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Wednesday, 24 June', // TODO: من التاريخ الحقيقي (intl)
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.dashTitle,
                    ),
                  ),
                  TextButton(
                    onPressed: () {}, // TODO: filter
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.dashAccent,
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'Filter',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Expanded(
                child: items.isEmpty
                    ? const Center(
                        child: Text(
                          'No appointments here yet',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.dashText,
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.only(bottom: 24),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 14),
                        itemBuilder: (context, i) => AppointmentCard(
                          appointment: items[i],
                          onTap: () {
                            final details = AppointmentDetailsModel.samples[items[i].id];
                            if (details == null) return; // مفيش تفاصيل لده لسه
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => DoctorAppointmentDetailsView(details: details),
                              ),
                            );
                          },
                          onMoreTap: () {}, // TODO
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({this.onBack});

  final VoidCallback? onBack;

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
          'Appointments',
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
