import 'package:flutter/material.dart';
import '../../../../feature/doctor/data/models/appointment_details_model.dart';
import '../../../../feature/doctor/data/models/patient_details_model.dart';
import '../../../../feature/doctor/presentation/view/doctor_appointment_details_view.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/appointment_model.dart';
import '../../widgets/appointment_card.dart';
import '../../widgets/appointments_tab_bar.dart';

class DoctorAppointmentsView extends StatefulWidget {
  const DoctorAppointmentsView({
    super.key,
    this.onBack,
    this.appointments = const [],
    this.dateHeaderLabel = '',
    this.onOpenPatientDetails,
    this.onAppointmentUpdated,
  });

  final VoidCallback? onBack;
  final List<AppointmentModel> appointments;
  final String dateHeaderLabel;
  final ValueChanged<PatientDetailsModel>? onOpenPatientDetails;
  final ValueChanged<AppointmentModel>? onAppointmentUpdated;

  @override
  State<DoctorAppointmentsView> createState() => _DoctorAppointmentsViewState();
}

class _DoctorAppointmentsViewState extends State<DoctorAppointmentsView> {
  int _tabIndex = 0;
  AppointmentStatus? _statusFilter;

  static const _tabs = ['Today', 'Upcoming', 'Completed'];

  List<AppointmentModel> get _filteredByTab {
    final all = widget.appointments;
    switch (_tabIndex) {
      case 1:
        return all
            .where(
              (a) =>
                  a.status == AppointmentStatus.pending ||
                  a.status == AppointmentStatus.confirmed ||
                  a.status == AppointmentStatus.inProgress,
            )
            .toList();
      case 2:
        return all
            .where(
              (a) =>
                  a.status == AppointmentStatus.completed ||
                  a.status == AppointmentStatus.cancelled,
            )
            .toList();
      case 0:
      default:
        return all;
    }
  }

  List<AppointmentModel> get _current {
    final list = _filteredByTab;
    if (_statusFilter == null) return list;
    return list.where((a) => a.status == _statusFilter).toList();
  }

  void _cycleFilter() {
    setState(() {
      if (_statusFilter == null) {
        _statusFilter = AppointmentStatus.confirmed;
      } else if (_statusFilter == AppointmentStatus.confirmed) {
        _statusFilter = AppointmentStatus.pending;
      } else {
        _statusFilter = null;
      }
    });
  }

  Future<void> _openDetails(AppointmentModel item) async {
    // TODO: اربطها بـ GET /api/v1/appointments/${item.id}
    final initialDetails = AppointmentDetailsModel.fromAppointmentAndJson(
      item,
      const {},
    );

    final updated = await Navigator.push<AppointmentDetailsModel>(
      context,
      MaterialPageRoute(
        builder: (_) => DoctorAppointmentDetailsView(
          details: initialDetails,
          onViewPatient: widget.onOpenPatientDetails,
        ),
      ),
    );

    if (updated != null && mounted) {
      widget.onAppointmentUpdated?.call(item.copyWith(status: updated.status));
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _current;
    final headerText = widget.dateHeaderLabel.trim().isNotEmpty
        ? widget.dateHeaderLabel.trim()
        : 'Appointments schedule';

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
                  Text(
                    headerText,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.dashTitle,
                    ),
                  ),
                  TextButton(
                    onPressed: _cycleFilter,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.dashAccent,
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      _statusFilter == null
                          ? 'Filter'
                          : 'Filter: ${_statusFilter!.name}',
                      style: const TextStyle(
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
                          onTap: () => _openDetails(items[i]),
                          onMoreTap: () => _openDetails(items[i]),
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
