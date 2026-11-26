import 'appointment_details_model.dart';

class PatientVisit {
  const PatientVisit({required this.dateLabel, required this.title});

  final String dateLabel;
  final String title;

  factory PatientVisit.fromJson(Map<String, dynamic> json) {
    return PatientVisit(
      dateLabel: (json['appointmentDate'] ?? json['dateLabel'] ?? '')
          .toString(),
      title: (json['serviceName'] ?? json['title'] ?? 'Visit').toString(),
    );
  }
}

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
  final List<String> medicalHistory;
  final List<PatientVisit> recentVisits;
  final String? imagePath;

  factory PatientDetailsModel.fromAppointmentDetails(
    AppointmentDetailsModel details, {
    List<String> medicalHistory = const [],
    List<PatientVisit> recentVisits = const [],
  }) {
    return PatientDetailsModel(
      id: details.patientId,
      name: details.patientName,
      gender: details.gender,
      age: details.age,
      bloodType: details.bloodType,
      patientCode: details.patientCode,
      phone: details.phone ?? 'Not provided',
      email: details.email ?? 'Not provided',
      dateOfBirth: details.dateOfBirth ?? 'Not provided',
      medicalHistory: medicalHistory,
      recentVisits: recentVisits,
      imagePath: details.imagePath,
    );
  }

  factory PatientDetailsModel.fromJson(Map<String, dynamic> json) {
    final historyRaw = json['medicalHistory'];
    final historyList = historyRaw is List
        ? historyRaw.map((e) => e.toString()).toList()
        : (historyRaw is String && historyRaw.trim().isNotEmpty
              ? [historyRaw.trim()]
              : <String>[]);

    final visitsRaw = json['visits'];
    final visitsList = visitsRaw is List
        ? visitsRaw
              .map((e) => PatientVisit.fromJson(e as Map<String, dynamic>))
              .toList()
        : <PatientVisit>[];

    return PatientDetailsModel(
      id: (json['patientId'] ?? json['userId'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? json['patientName'] ?? 'Patient').toString(),
      gender: (json['gender'] ?? 'N/A').toString(),
      age: (json['age'] as num?)?.toInt() ?? 0,
      bloodType: (json['bloodType'] ?? 'N/A').toString(),
      patientCode: (json['patientCode'] ?? '#PT-${json['patientId'] ?? ''}')
          .toString(),
      phone: (json['phone'] ?? 'Not provided').toString(),
      email: (json['email'] ?? 'Not provided').toString(),
      dateOfBirth: (json['birthDate'] ?? json['dateOfBirth'] ?? 'Not provided')
          .toString(),
      medicalHistory: historyList,
      recentVisits: visitsList,
      imagePath:
          json['profilePictureUrl']?.toString() ??
          json['imagePath']?.toString(),
    );
  }
}
