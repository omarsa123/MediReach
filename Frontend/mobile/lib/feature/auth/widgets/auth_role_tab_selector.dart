import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

enum AuthRole { patient, provider, organizer }

class AuthRoleTabSelector extends StatelessWidget {
  const AuthRoleTabSelector({
    super.key,
    required this.selectedRole,
    required this.onRoleChanged,
  });

  final AuthRole selectedRole;
  final ValueChanged<AuthRole> onRoleChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.inputBorder, width: 1),
      ),
      child: Row(
        children: [
          _TabItem(
            label: 'Patient',
            isSelected: selectedRole == AuthRole.patient,
            onTap: () => onRoleChanged(AuthRole.patient),
          ),
          _TabItem(
            label: 'Provider',
            isSelected: selectedRole == AuthRole.provider,
            onTap: () => onRoleChanged(AuthRole.provider),
          ),
        ],
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  const _TabItem({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: isSelected
                ? Border.all(
                    color: AppColors.button1background.withValues(alpha: 0.35),
                    width: 1.2,
                  )
                : null,
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppColors.button1background : const Color(0xFF64748B),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
