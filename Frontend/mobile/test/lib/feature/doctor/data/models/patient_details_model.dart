class PatientVisit {
  const PatientVisit({required this.dateLabel, required this.title});

  final String dateLabel;
  final String title;
}

/// بيانات المريض اللي الدكتور بيشوفها. هتتبدل بـ fromJson لما الـ API يجهز
class PatientDetailsModel {
  const PatientDetailsModel({
    required this.id,
    required this.name,
    required this.gender,
    required this.age,
    required this.bloodType,
    required this.patientCode,
    required this.phone,
    required this.email,
    required this.dateOfBirth,
    required this.medicalHistory,
    required this.recentVisits,
    this.imagePath,
  });

  final String id;
  final String name;
  final String gender;
  final int age;
  final String bloodType;
  final String patientCode;
  final String phone;
  final String email;
  final String dateOfBirth;
  final List<String> medicalHistory; // مثلاً: أمراض مزمنة، حساسية
  final List<PatientVisit> recentVisits;
  final String? imagePath;

  /// داتا تجريبية، امسحيها بعد الربط
  static const sample = PatientDetailsModel(
    id: '1',
    name: 'Ahmed Mohamed',
    gender: 'Male',
    age: 28,
    bloodType: 'O+',
    patientCode: '#PT-00248',
    phone: '+20 100 123 4567',
    email: 'ahmed.mohamed@email.com',
    dateOfBirth: '15 March 1998',
    medicalHistory: [
      'Hypertension · Diagnosed in 2023',
      'No known allergies',
    ],
    recentVisits: [
      PatientVisit(
        dateLabel: '20 June 2026',
        title: 'Routine cardiology checkup',
      ),
    ],
  );
}