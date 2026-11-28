import 'package:flutter/material.dart';
import '../../../../feature/doctor/data/models/patient_details_model.dart';
import '../../../../feature/doctor/presentation/view/doctor_patient_details_view.dart';
import '../../widgets/doctor_buttom_nav.dart';
import 'doctor_appointments_view.dart';
import 'doctor_dashboard_view.dart';

/// الشاشة الأساسية للدكتور: بتحتفظ بالـ bottom nav وبتبدّل بين التابات
class DoctorMainView extends StatefulWidget {
  const DoctorMainView({super.key});

  @override
  State<DoctorMainView> createState() => _DoctorMainViewState();
}

class _DoctorMainViewState extends State<DoctorMainView> {
  int _currentIndex = 0;

  void _goTo(int i) => setState(() => _currentIndex = i);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          const DoctorDashboardView(),
          DoctorAppointmentsView(onBack: () => _goTo(0)),
          const DoctorPatientDetailsView(patient: PatientDetailsModel.sample),
          const _Placeholder('Messages'), // TODO
          const _Placeholder('Profile'), // TODO
        ],
      ),
      bottomNavigationBar: DoctorBottomNav(
        currentIndex: _currentIndex,
        onTap: _goTo,
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder(this.title);
  final String title;

  @override
  Widget build(BuildContext context) => Center(child: Text(title));
}
