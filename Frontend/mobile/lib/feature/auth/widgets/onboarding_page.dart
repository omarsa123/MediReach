import 'package:flutter/material.dart';
import 'package:MediReach/core/constants/app_assets.dart';
import 'package:MediReach/core/constants/app_fonts.dart';

class OnboardingPage extends StatelessWidget {
  const OnboardingPage({super.key , required this.imggName , required this.subTitle , required this.title});
  final String imggName ;
  final String title; 
  final String subTitle; 
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        
        mainAxisAlignment: .center,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: Image.asset("${AppAssets.imgPath}${imggName}" , width: 250,height: 250,),
          ),
          Text(title , style: AppFonts.mainTitle.copyWith(fontSize: 30), textAlign: .center,),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: Text(subTitle , style: AppFonts.subTitle.copyWith(fontSize: 15),textAlign: .center,),
          )
        ],
      ),
    );
  }
}