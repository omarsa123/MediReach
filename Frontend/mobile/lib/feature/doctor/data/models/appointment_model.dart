enum AppointmentStatus { confirmed, pending, inProgress, completed, cancelled }

class AppointmentModel {
  const AppointmentModel({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.type,
    required this.durationMinutes,
    required this.dateLabel,
    required this.status,
    this.appointmentDate,
    this.startTime,
    this.endTime,
    this.priceAtBooking,
    this.imagePath,
  });

  final String id;
  final String patientId;
  final String patientName;
  final String type;
  final int durationMinutes;
  final String dateLabel;
  final AppointmentStatus status;
  final String? appointmentDate;
  final String? startTime;
  final String? endTime;
  final double? priceAtBooking;
  final String? imagePath;

  static AppointmentStatus parseStatus(String? raw) {
    switch ((raw ?? '').trim().toLowerCase()) {
      case 'confirmed':
        return AppointmentStatus.confirmed;
      case 'inprogress':
      case 'in_progress':
        return AppointmentStatus.inProgress;
      case 'completed':
        return AppointmentStatus.completed;
      case 'cancelled':
      case 'canceled':
        return AppointmentStatus.cancelled;
      case 'pending':
      default:
        return AppointmentStatus.pending;
    }
  }

  String toApiStatus() {
    switch (status) {
      case AppointmentStatus.confirmed:
        return 'Confirmed';
      case AppointmentStatus.inProgress:
        return 'InProgress';
      case AppointmentStatus.completed:
        return 'Completed';
      case AppointmentStatus.cancelled:
        return 'Cancelled';
      case AppointmentStatus.pending:
        return 'Pending';
    }
  }

  AppointmentModel copyWith({AppointmentStatus? status, String? dateLabel}) {
    return AppointmentModel(
      id: id,
      patientId: patientId,
      patientName: patientName,
      type: type,
      durationMinutes: durationMinutes,
      dateLabel: dateLabel ?? this.dateLabel,
      status: status ?? this.status,
      appointmentDate: appointmentDate,
      startTime: startTime,
      endTime: endTime,
      priceAtBooking: priceAtBooking,
      imagePath: imagePath,
    );
  }

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    final start = (json['startTime'] ?? '').toString();
    final end = (json['endTime'] ?? '').toString();
    final date = (json['appointmentDate'] ?? '').toString();

    int duration = (json['durationMinutes'] as num?)?.toInt() ?? 0;
    if (duration <= 0 && start.isNotEmpty && end.isNotEmpty) {
      final sParts = start.split(':');
      final eParts = end.split(':');
      if (sParts.length >= 2 && eParts.length >= 2) {
        final sMins =
            (int.tryParse(sParts[0]) ?? 0) * 60 +
            (int.tryParse(sParts[1]) ?? 0);
        final eMins =
            (int.tryParse(eParts[0]) ?? 0) * 60 +
            (int.tryParse(eParts[1]) ?? 0);
        if (eMins > sMins) duration = eMins - sMins;
      }
    }
    if (duration <= 0) duration = 30;

    final label = [
      if (date.isNotEmpty) date,
      if (start.isNotEmpty) start,
    ].join(' · ');

    return AppointmentModel(
      id: (json['appointmentId'] ?? json['id'] ?? '').toString(),
      patientId: (json['patientId'] ?? '').toString(),
      patientName: (json['patientName'] ?? 'Patient').toString(),
      type: (json['serviceName'] ?? json['type'] ?? 'Consultation').toString(),
      durationMinutes: duration,
      dateLabel: label.isNotEmpty ? label : 'Scheduled',
      status: parseStatus(json['status']?.toString()),
      appointmentDate: date.isNotEmpty ? date : null,
      startTime: start.isNotEmpty ? start : null,
      endTime: end.isNotEmpty ? end : null,
      priceAtBooking: (json['priceAtBooking'] as num?)?.toDouble(),
      imagePath:
          json['patientProfilePicture']?.toString() ??
          json['imagePath']?.toString(),
    );
  }
}
