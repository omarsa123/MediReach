import 'package:flutter/material.dart';

/// زرار مستطيل بلون قابل للتغيير (Accept / Decline / Start consultation)
class FilledActionButton extends StatelessWidget {
  const FilledActionButton({
    super.key,
    required this.label,
    required this.onTap,
    required this.backgroundColor,
    required this.foregroundColor,
    this.icon,
  });

  final String label;
  final VoidCallback? onTap;
  final Color backgroundColor;
  final Color foregroundColor;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(6),
      child: InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: onTap,
        child: SizedBox(
          height: 48,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20, color: foregroundColor),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: foregroundColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}