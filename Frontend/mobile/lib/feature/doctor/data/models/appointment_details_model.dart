import 'appointment_model.dart';

/// تفاصيل الموعد (للشاشة اللي بتفتح لما تدوسي على كارت الموعد)
class AppointmentDetailsModel {
  const AppointmentDetailsModel({
    required this.id,
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
    this.imagePath,
  });

  final String id;
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
  final String? imagePath;


  /// داتا تجريبية لكل موعد بالـ id (البيانات الطبية من عندي كمثال، امسحيها بعد الربط)
  static const samples = <String, AppointmentDetailsModel>{
    '1': AppointmentDetailsModel(
    id: '1',
    patientName: 'Ahmed Mohamed',
    gender: 'Male',
    age: 28,
    bloodType: 'O+',
    patientCode: '#PT-00248',
    status: AppointmentStatus.confirmed,
    dateLabel: 'Wednesday, 24 June 2026',
    timeLabel: '10:00 AM – 10:30 AM',
    consultationType: 'Video consultation',
    reason:
        'Occasional chest discomfort and follow-up on recent blood test results.',
    notes:
        'No known allergies. Currently taking prescribed blood pressure medication.',
  ),
    '2': AppointmentDetailsModel(
      id: '2',
      patientName: 'Mona Hassan',
      gender: 'Female',
      age: 34,
      bloodType: 'A+',
      patientCode: '#PT-00251',
      status: AppointmentStatus.pending,
      dateLabel: 'Wednesday, 24 June 2026',
      timeLabel: '11:30 AM – 12:00 PM',
      consultationType: 'Video consultation',
      reason: 'Persistent headaches over the past two weeks.',
      notes: 'No known allergies.',
    ),
    '3': AppointmentDetailsModel(
      id: '3',
      patientName: 'Omar Khaled',
      gender: 'Male',
      age: 41,
      bloodType: 'B+',
      patientCode: '#PT-00263',
      status: AppointmentStatus.confirmed,
      dateLabel: 'Wednesday, 24 June 2026',
      timeLabel: '01:00 PM – 01:30 PM',
      consultationType: 'Video consultation',
      reason: 'Routine check-up and blood pressure follow-up.',
      notes: 'No known allergies.',
    ),
    '4': AppointmentDetailsModel(
      id: '4',
      patientName: 'Nour Ahmed',
      gender: 'Female',
      age: 26,
      bloodType: 'O-',
      patientCode: '#PT-00270',
      status: AppointmentStatus.confirmed,
      dateLabel: 'Wednesday, 24 June 2026',
      timeLabel: '02:30 PM – 03:00 PM',
      consultationType: 'Video consultation',
      reason: 'Follow-up on recent lab results.',
      notes: 'No known allergies.',
    ),
  };
}