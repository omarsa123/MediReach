import 'package:flutter/material.dart';
import 'package:MediReach/core/constants/app_colors.dart';
import 'package:MediReach/core/constants/app_fonts.dart';
import 'package:MediReach/feature/auth/widgets/onboarding_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OnbardingView extends StatefulWidget {
  const OnbardingView({super.key});

  @override
  State<OnbardingView> createState() => _OnbardingViewState();
}

class _OnbardingViewState extends State<OnbardingView> {
  final PageController cont = PageController();
  int currentPage = 0;

  final List<OnboardingPage> pages = const [
    OnboardingPage(
      imggName: "onboarding1.png",
      subTitle:
          "Connect with trusted healthcare professionals and take the first step toward a healthier life.",
      title: "Your health , Our priority",
    ),
    OnboardingPage(
      imggName: "onboarding2.png",
      subTitle:
          "Browse specialists, choose a convenient time, and book your appointment in just a few taps.",
      title: "Find the right doctor for you",
    ),
    OnboardingPage(
      imggName: "onboarding3.png",
      subTitle:
          "Consult with experienced doctors from the comfort of your home. We’re here when you need us.",
      title: "Quality care , anytime , anywhere",
    ),
  ];
  SharedPreferences? sp;

  @override
  void initState() {
    super.initState();
    initPrefs();
  }

  Future<void> initPrefs() async {
    sp = await SharedPreferences.getInstance();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: () async {
              if (sp == null) {
                return;
              } else {
                await sp!.setBool("isVisit", true);
                Navigator.pushReplacementNamed(context, '/select_role');
              }
            },
            child: Text("Skip", style: AppFonts.smallSubTitle),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: PageView(
              onPageChanged: (value) {
                setState(() {
                  currentPage = value;
                });
              },
              controller: cont,
              children: pages,
            ),
          ),
          Row(
            mainAxisAlignment: .center,
            children: List.generate(3, (index) {
              return AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: EdgeInsets.symmetric(horizontal: 8),
                width: currentPage == index ? 22 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: currentPage == index
                      ? AppColors.button1background
                      : AppColors.blueGray,
                  borderRadius: BorderRadius.circular(
                    currentPage == index ? 15 : 999,
                  ),
                ),
              );
            }),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: ElevatedButton(
              onPressed: () async {
                if (currentPage < pages.length - 1) {
                  cont.nextPage(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                  );
                } else {
                  if (sp == null) {
                    return;
                  } else {
                    await sp!.setBool("isVisit", true);
                    Navigator.pushReplacementNamed(context, '/select_role');
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                minimumSize: Size(335, 54),
                backgroundColor: AppColors.button1background,
              ),
              child: Text(
                currentPage == pages.length - 1 ? "Get Started" : "Next",
                style: AppFonts.buttonText,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
