enum AppointmentStatus { confirmed, pending }

/// مؤقتاً بنستخدمه بداتا تجريبية، وبعدين هنضيف fromJson لما الـ API يجهز
class AppointmentModel {
  const AppointmentModel({
    required this.id,
    required this.patientName,
    required this.type,
    required this.durationMinutes,
    required this.dateLabel, // TODO: خليها DateTime وننسقها بـ intl بعد الربط
    required this.status,
    this.imagePath,
  });

  final String id;
  final String patientName;
  final String type;
  final int durationMinutes;
  final String dateLabel;
  final AppointmentStatus status;
  final String? imagePath;
}