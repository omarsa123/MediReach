import 'package:flutter/material.dart';
import '../../../../feature/doctor/data/models/appointment_model.dart';
import '../../../../feature/doctor/data/models/patient_details_model.dart';
import '../../../../feature/doctor/presentation/view/doctor_patient_details_view.dart';
import '../../widgets/doctor_buttom_nav.dart';
import 'doctor_appointments_view.dart';
import 'doctor_dashboard_view.dart';

class DoctorMainView extends StatefulWidget {
  const DoctorMainView({
    super.key,
    this.doctorName = '',
    this.doctorImagePath,
    this.appointments = const [],
    this.appointmentsCount = 0,
    this.patientsCount = 0,
    this.earningsLabel = '\$0',
    this.dateHeaderLabel = '',
    this.initialIndex = 0,
  });

  final String doctorName;
  final String? doctorImagePath;
  final List<AppointmentModel> appointments;
  final int appointmentsCount;
  final int patientsCount;
  final String earningsLabel;
  final String dateHeaderLabel;
  final int initialIndex;

  @override
  State<DoctorMainView> createState() => _DoctorMainViewState();
}

class _DoctorMainViewState extends State<DoctorMainView> {
  late int _currentIndex = widget.initialIndex;
  late List<AppointmentModel> _appointments = List.of(widget.appointments);
  PatientDetailsModel? _selectedPatient;

  void _goTo(int i) => setState(() => _currentIndex = i);

  void _openPatientDetails(PatientDetailsModel patient) {
    setState(() {
      _selectedPatient = patient;
      _currentIndex = 2;
    });
  }

  void _handleAppointmentUpdated(AppointmentModel updated) {
    setState(() {
      final idx = _appointments.indexWhere((a) => a.id == updated.id);
      if (idx != -1) {
        _appointments[idx] = updated;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          DoctorDashboardView(
            doctorName: widget.doctorName,
            doctorImagePath: widget.doctorImagePath,
            appointments: _appointments,
            appointmentsCount: widget.appointmentsCount > 0
                ? widget.appointmentsCount
                : _appointments.length,
            patientsCount: widget.patientsCount,
            earningsLabel: widget.earningsLabel,
            onSeeAllAppointments: () => _goTo(1),
            onOpenAppointmentsTab: () => _goTo(1),
            onOpenPatientsTab: _selectedPatient != null
                ? () => _goTo(2)
                : () => _goTo(1),
            onSelectPatient: _openPatientDetails,
            onAppointmentUpdated: _handleAppointmentUpdated,
          ),
          DoctorAppointmentsView(
            onBack: () => _goTo(0),
            appointments: _appointments,
            dateHeaderLabel: widget.dateHeaderLabel,
            onOpenPatientDetails: _openPatientDetails,
            onAppointmentUpdated: _handleAppointmentUpdated,
          ),
          _selectedPatient != null
              ? DoctorPatientDetailsView(patient: _selectedPatient!)
              : const _EmptyTabState(
                  title: 'Patient details',
                  subtitle: 'Select an appointment to view patient details.',
                ),
          const _EmptyTabState(
            title: 'Messages',
            subtitle: 'Messages will appear here once connected.',
          ),
          const _EmptyTabState(
            title: 'Profile',
            subtitle: 'Provider profile settings.',
          ),
        ],
      ),
      bottomNavigationBar: DoctorBottomNav(
        currentIndex: _currentIndex,
        onTap: _goTo,
      ),
    );
  }
}

class _EmptyTabState extends StatelessWidget {
  const _EmptyTabState({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
