import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// Today / Upcoming / Completed
class AppointmentsTabBar extends StatelessWidget {
  const AppointmentsTabBar({
    super.key,
    required this.labels,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<String> labels;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.dashStatBg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: List.generate(labels.length, (i) {
          final selected = i == selectedIndex;
          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onChanged(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected ? AppColors.dashAccent : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  labels[i],
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: selected ? Colors.white : AppColors.dashText,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}