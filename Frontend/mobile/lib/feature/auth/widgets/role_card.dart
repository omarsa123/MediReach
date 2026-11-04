import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import 'feature_tag.dart';
import 'package:flutter_svg/flutter_svg.dart';


class RoleCard extends StatelessWidget {
  const RoleCard({
    super.key,
    required this.title,
    required this.badge,
    required this.subtitle,
    required this.description,
    required this.tags,
    required this.selected,
    required this.onTap,
    required this.iconPath,
    required this.iconColor,  
  });

  final String title;
  final String badge;
  final String subtitle;
  final String description;
  final List<FeatureTag> tags;
  final bool selected;
  final VoidCallback onTap;
  final String iconPath;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? Color(0xFF059669) : Colors.transparent,
            width: 2,
          ),
          gradient: selected
              ? const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFF0FDF9), Colors.white],
                )
              : null,
          color: selected ? null : Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.iconBg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: SvgPicture.asset(
                    iconPath,
                    width: 24,
                    height: 24,
                    colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: Colors.black,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: selected ? AppColors.badgeGreenBg : AppColors.badgeGrayBg,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              badge,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: selected ? AppColors.badgeGreenText : AppColors.textBody,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.secondary),
                      ),
                    ],
                  ),
                ),
                _RadioDot(selected: selected),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              description,
              style: const TextStyle(
                  fontSize: 13, height: 1.4, color: AppColors.textBody),
            ),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: tags),
          ],
        ),
      ),
    );
  }
}

class _RadioDot extends StatelessWidget {
  const _RadioDot({required this.selected});
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? Color(0xFF059669) : Colors.white,
        border: Border.all(
          color: selected ? Color(0xFF059669) : const Color(0xFFD1D5DB),
          width: 1.5,
        ),
      ),
      child: selected
          ? const Center(
              child: CircleAvatar(radius: 4, backgroundColor: Colors.white),
            )
          : null,
    );
  }
}