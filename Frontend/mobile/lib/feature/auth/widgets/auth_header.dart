import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class AuthHeader extends StatelessWidget {
  const AuthHeader({
    super.key,
    this.title = 'MeadReach',
    this.subtitle = 'Healthcare Solutions',
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.tealLight,
            shape: BoxShape.circle,
            border: Border.all(
              color: AppColors.tealPrimary.withValues(alpha: 0.2),
              width: 1.5,
            ),
          ),
          child: Center(
            child: CustomPaint(
              size: const Size(30, 28),
              painter: _HeartbeatPulsePainter(color: AppColors.tealPrimary),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.primary,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          subtitle,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppColors.secondary,
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }
}

class _HeartbeatPulsePainter extends CustomPainter {
  const _HeartbeatPulsePainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final w = size.width;
    final h = size.height;

    // Heart outline
    final heartPath = Path();
    heartPath.moveTo(w * 0.5, h * 0.88);
    // Left bottom up to left lobe
    heartPath.cubicTo(
      w * 0.15,
      h * 0.62,
      0,
      h * 0.40,
      0,
      h * 0.26,
    );
    heartPath.cubicTo(
      0,
      h * 0.08,
      w * 0.18,
      0,
      w * 0.35,
      0,
    );
    heartPath.cubicTo(
      w * 0.42,
      0,
      w * 0.48,
      h * 0.08,
      w * 0.5,
      h * 0.18,
    );
    // Right lobe
    heartPath.cubicTo(
      w * 0.52,
      h * 0.08,
      w * 0.58,
      0,
      w * 0.65,
      0,
    );
    heartPath.cubicTo(
      w * 0.82,
      0,
      w,
      h * 0.08,
      w,
      h * 0.26,
    );
    heartPath.cubicTo(
      w,
      h * 0.40,
      w * 0.85,
      h * 0.62,
      w * 0.5,
      h * 0.88,
    );
    canvas.drawPath(heartPath, paint);

    // Pulse wave inside
    final pulsePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final pulsePath = Path();
    final midY = h * 0.45;
    pulsePath.moveTo(w * 0.20, midY);
    pulsePath.lineTo(w * 0.36, midY);
    pulsePath.lineTo(w * 0.43, midY - h * 0.18);
    pulsePath.lineTo(w * 0.52, midY + h * 0.22);
    pulsePath.lineTo(w * 0.60, midY - h * 0.10);
    pulsePath.lineTo(w * 0.66, midY);
    pulsePath.lineTo(w * 0.80, midY);

    canvas.drawPath(pulsePath, pulsePaint);
  }

  @override
  bool shouldRepaint(covariant _HeartbeatPulsePainter oldDelegate) =>
      oldDelegate.color != color;
}
