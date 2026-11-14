import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class AuthTextField extends StatefulWidget {
  const AuthTextField({
    super.key,
    required this.label,
    required this.hintText,
    this.controller,
    this.prefixIcon,
    this.prefixWidget,
    this.suffixIcon,
    this.isPassword = false,
    this.keyboardType,
    this.validator,
    this.readOnly = false,
    this.onTap,
  });

  final String label;
  final String hintText;
  final TextEditingController? controller;
  final IconData? prefixIcon;
  final Widget? prefixWidget;
  final Widget? suffixIcon;
  final bool isPassword;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final bool readOnly;
  final VoidCallback? onTap;

  @override
  State<AuthTextField> createState() => _AuthTextFieldState();
}

class _AuthTextFieldState extends State<AuthTextField> {
  bool _obscureText = true;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: widget.controller,
          obscureText: widget.isPassword && _obscureText,
          keyboardType: widget.keyboardType,
          validator: widget.validator,
          readOnly: widget.readOnly,
          onTap: widget.onTap,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Color(0xFF0F172A),
          ),
          decoration: InputDecoration(
            hintText: widget.hintText,
            hintStyle: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w400,
              color: Color(0xFF94A3B8),
            ),
            filled: true,
            fillColor: AppColors.inputBackground,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 14,
            ),
            prefixIcon: widget.prefixWidget ??
                (widget.prefixIcon != null
                    ? Icon(
                        widget.prefixIcon,
                        size: 20,
                        color: const Color(0xFF64748B),
                      )
                    : null),
            suffixIcon: widget.isPassword
                ? IconButton(
                    icon: Icon(
                      _obscureText
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 20,
                      color: const Color(0xFF94A3B8),
                    ),
                    onPressed: () {
                      setState(() {
                        _obscureText = !_obscureText;
                      });
                    },
                  )
                : widget.suffixIcon,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.inputBorder, width: 1.2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(
                color: AppColors.button1background,
                width: 1.5,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.redAccent, width: 1.2),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
