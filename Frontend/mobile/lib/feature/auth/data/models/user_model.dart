import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String userId;
  final String name;
  final String username;
  final String email;
  final String phone;
  final String role;
  final String status;
  final String? address;
  final String? profilePictureUrl;
  final String? specialization;
  final String? licenseNumber;
  final String? providerType;
  final String? bloodType;
  final String? createdAt;

  const UserModel({
    required this.userId,
    required this.name,
    required this.username,
    required this.email,
    required this.phone,
    required this.role,
    this.status = 'Active',
    this.address,
    this.profilePictureUrl,
    this.specialization,
    this.licenseNumber,
    this.providerType,
    this.bloodType,
    this.createdAt,
  });

  bool get isDoctor => role == 'provider' || role == 'doctor';
  bool get isPatient => role == 'patient';
  bool get isOrganizer => role == 'organization' || role == 'organizer';

  dynamic operator [](String key) => toJson()[key];

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      userId: (json['userId'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      username: (json['username'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      role: (json['role'] ?? 'patient').toString(),
      status: (json['status'] ?? 'Active').toString(),
      address: json['address']?.toString(),
      profilePictureUrl: json['profilePictureUrl']?.toString(),
      specialization: json['specialization']?.toString(),
      licenseNumber: json['licenseNumber']?.toString(),
      providerType: json['providerType']?.toString(),
      bloodType: json['bloodType']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'name': name,
      'username': username,
      'email': email,
      'phone': phone,
      'role': role,
      'status': status,
      if (address != null) 'address': address,
      if (profilePictureUrl != null) 'profilePictureUrl': profilePictureUrl,
      if (specialization != null) 'specialization': specialization,
      if (licenseNumber != null) 'licenseNumber': licenseNumber,
      if (providerType != null) 'providerType': providerType,
      if (bloodType != null) 'bloodType': bloodType,
      if (createdAt != null) 'createdAt': createdAt,
    };
  }

  UserModel copyWith({
    String? userId,
    String? name,
    String? username,
    String? email,
    String? phone,
    String? role,
    String? status,
    String? address,
    String? profilePictureUrl,
    String? specialization,
    String? licenseNumber,
    String? providerType,
    String? bloodType,
    String? createdAt,
  }) {
    return UserModel(
      userId: userId ?? this.userId,
      name: name ?? this.name,
      username: username ?? this.username,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      status: status ?? this.status,
      address: address ?? this.address,
      profilePictureUrl: profilePictureUrl ?? this.profilePictureUrl,
      specialization: specialization ?? this.specialization,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      providerType: providerType ?? this.providerType,
      bloodType: bloodType ?? this.bloodType,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [
        userId,
        name,
        username,
        email,
        phone,
        role,
        status,
        address,
        profilePictureUrl,
        specialization,
        licenseNumber,
        providerType,
        bloodType,
        createdAt,
      ];
}
