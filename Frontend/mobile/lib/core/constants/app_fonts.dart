import 'package:flutter/material.dart';
import 'package:MediReach/core/constants/app_colors.dart';

abstract final class AppFonts {
  static final mainTitle = TextStyle(
    fontSize: 24 ,
    color:  AppColors.primary,
    fontWeight: .bold
  );
  static final subTitle = TextStyle(
    fontSize: 18 ,
    color:  AppColors.primary,
    fontWeight: .w400
  );
  static final smallSubTitle = TextStyle(
    fontSize: 12 ,
    color:  AppColors.secondary,
    fontWeight: .w600
  );
  static final buttonText = TextStyle(
    color: AppColors.buttonsTextColor,
    fontSize: 16,
    fontWeight: .bold
  );
}