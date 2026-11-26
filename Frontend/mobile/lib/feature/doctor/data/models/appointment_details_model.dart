import 'appointment_model.dart';

class AppointmentDetailsModel {
  const AppointmentDetailsModel({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.gender,
    required this.age,
    required this.bloodType,
    required this.patientCode,
    required this.status,
    required this.dateLabel,
    required this.timeLabel,
    required this.consultationType,
    required this.reason,
    required this.notes,
    this.phone,
    this.email,
    this.dateOfBirth,
    this.imagePath,
  });

  final String id;
  final String patientId;
  final String patientName;
  final String gender;
  final int age;
  final String bloodType;
  final String patientCode;
  final AppointmentStatus status;
  final String dateLabel;
  final String timeLabel;
  final String consultationType;
  final String reason;
  final String notes;
  final String? phone;
  final String? email;
  final String? dateOfBirth;
  final String? imagePath;

  AppointmentDetailsModel copyWith({AppointmentStatus? status, String? notes}) {
    return AppointmentDetailsModel(
      id: id,
      patientId: patientId,
      patientName: patientName,
      gender: gender,
      age: age,
      bloodType: bloodType,
      patientCode: patientCode,
      status: status ?? this.status,
      dateLabel: dateLabel,
      timeLabel: timeLabel,
      consultationType: consultationType,
      reason: reason,
      notes: notes ?? this.notes,
      phone: phone,
      email: email,
      dateOfBirth: dateOfBirth,
      imagePath: imagePath,
    );
  }

  factory AppointmentDetailsModel.fromAppointmentAndJson(
    AppointmentModel summary,
    Map<String, dynamic> json,
  ) {
    final start = (json['startTime'] ?? summary.startTime ?? '').toString();
    final end = (json['endTime'] ?? summary.endTime ?? '').toString();
    final timeRange = (start.isNotEmpty && end.isNotEmpty)
        ? '$start – $end'
        : (start.isNotEmpty ? start : summary.dateLabel);

    final mode = (json['deliveryMode'] ?? '').toString();
    final serviceName = (json['serviceName'] ?? summary.type).toString();
    final typeText = mode.isNotEmpty ? '$serviceName ($mode)' : serviceName;

    return AppointmentDetailsModel(
      id: summary.id,
      patientId: (json['patientId'] ?? summary.patientId).toString(),
      patientName: (json['patientName'] ?? summary.patientName).toString(),
      gender: (json['patientGender'] ?? json['gender'] ?? 'N/A').toString(),
      age:
          (json['patientAge'] as num?)?.toInt() ??
          (json['age'] as num?)?.toInt() ??
          0,
      bloodType: (json['patientBloodType'] ?? json['bloodType'] ?? 'N/A')
          .toString(),
      patientCode: (json['patientCode'] ?? '#PT-${summary.patientId}')
          .toString(),
      status: json['status'] != null
          ? AppointmentModel.parseStatus(json['status'].toString())
          : summary.status,
      dateLabel:
          (json['appointmentDate'] ??
                  summary.appointmentDate ??
                  summary.dateLabel)
              .toString(),
      timeLabel: timeRange,
      consultationType: typeText,
      reason: (json['visitNotes'] ?? json['reason'] ?? 'Not specified')
          .toString(),
      notes: (json['notes'] ?? json['visitAddress'] ?? 'No additional notes')
          .toString(),
      phone: json['patientPhone']?.toString(),
      email: json['patientEmail']?.toString(),
      dateOfBirth: json['dateOfBirth']?.toString(),
      imagePath: summary.imagePath,
    );
  }
}
