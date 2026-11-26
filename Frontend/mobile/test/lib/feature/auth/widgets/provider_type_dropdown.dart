import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';

class ProviderTypeDropdown extends StatefulWidget {
  const ProviderTypeDropdown({
    super.key,
    required this.roles,
    required this.selectedRole,
    required this.onChanged,
    this.label = 'Provider role',
    this.menuHeight = 240,
  });

  final List<String> roles;
  final String? selectedRole;
  final ValueChanged<String> onChanged;
  final String label;
  final double menuHeight;

  @override
  State<ProviderTypeDropdown> createState() => _ProviderTypeDropdownState();
}

class _ProviderTypeDropdownState extends State<ProviderTypeDropdown> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),

        InkWell(
          onTap: () {
            setState(() {
              _isExpanded = !_isExpanded;
            });
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.inputBorder),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.selectedRole ?? 'Select ${widget.label}',
                    style: TextStyle(
                      color: widget.selectedRole == null
                          ? Colors.grey
                          : Colors.black,
                    ),
                  ),
                ),
                Icon(
                  _isExpanded
                      ? Icons.keyboard_arrow_up
                      : Icons.keyboard_arrow_down,
                ),
              ],
            ),
          ),
        ),

        AnimatedSize(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          alignment: Alignment.topCenter,
          child: _isExpanded
              ? Container(
                  margin: const EdgeInsets.only(top: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: AppColors.inputBorder),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxHeight: widget.menuHeight),
                    child: ListView.separated(
                      shrinkWrap: true,
                      padding: EdgeInsets.zero,
                      itemCount: widget.roles.length,
                      separatorBuilder: (_, __) =>
                          Divider(height: 1, color: AppColors.inputBorder),
                      itemBuilder: (context, index) {
                        final role = widget.roles[index];
                        final isSelected = role == widget.selectedRole;

                        return InkWell(
                          onTap: () {
                            widget.onChanged(role);
                            setState(() {
                              _isExpanded = false;
                            });
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 13,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    role,
                                    style: TextStyle(
                                      color: isSelected
                                          ? AppColors.button1background
                                          : Colors.black,
                                      fontWeight: isSelected
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                    ),
                                  ),
                                ),
                                if (isSelected)
                                  Icon(
                                    Icons.check,
                                    color: AppColors.button1background,
                                    size: 20,
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}
