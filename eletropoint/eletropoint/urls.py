"""
URL configuration for eletropoint project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.homepage, name='homepage'),

    # -------------------- LOGIN / REGISTER PAGE -------------------- #
    path('login/', views.loginPage, name='loginPage'),
    path('register/', views.registerPage, name='registerPage'),

    # -------------------- SMARTPHONES -------------------- #
    path('smartphones/', views.smartphones, name='smartphones'),
    
    # Apple
    path('smartphones/apple/', views.smartphoneApple, name='smartphoneApple'),
    path('smartphones/apple/iphone-air/', views.iphoneAir, name='iphoneAir'),
    path('smartphones/apple/iphone-17-pro/', views.iphone17Pro, name='iphone17Pro'),
    path('smartphones/apple/iphone-17/', views.iphone17, name='iphone17'),
    path('smartphones/apple/iphone-16/', views.iphone16, name='iphone16'),
    path('smartphones/apple/iphone-16e/', views.iphone16e, name='iphone16e'),

    # Google
    path('smartphones/google/', views.smartphoneGoogle, name='smartphoneGoogle'),
    path('smartphones/google/pixel-10-pro-xl/', views.pixel10ProXL, name='pixel10ProXL'),
    path('smartphones/google/pixel-10-pro/', views.pixel10Pro, name='pixel10Pro'),
    path('smartphones/google/pixel-10/', views.pixel10, name='pixel10'),

    # Samsung
    path('smartphones/samsung/', views.smartphoneSamsung, name='smartphoneSamsung'),
    path('smartphones/samsung/s25-ultra/', views.s25Ultra, name='s25Ultra'),
    path('smartphones/samsung/s25-edge/', views.s25Edge, name='s25Edge'),
    path('smartphones/samsung/s25/', views.s25, name='s25'),
    path('smartphones/samsung/z-fold-7/', views.zFold7, name='zFold7'),
    path('smartphones/samsung/z-flip-7/', views.zFlip7, name='zFlip7'),

    # Xiaomi
    path('smartphones/xiaomi/', views.smartphoneXiaomi, name='smartphoneXiaomi'),
    path('smartphones/xiaomi/15-ultra/', views.xiaomi15Ultra, name='xiaomi15Ultra'),
    path('smartphones/xiaomi/15/', views.xiaomi15, name='xiaomi15'),
    path('smartphones/xiaomi/15t-pro/', views.xiaomi15tPro, name='xiaomi15tPro'),
    path('smartphones/xiaomi/15t/', views.xiaomi15t, name='xiaomi15t'),
    path('smartphones/xiaomi/redmi-note-15-pro-plus/', views.redmiNote15ProPlus, name='redmiNote15ProPlus'),

    # -------------------- COMPUTADORES -------------------- #
    path('computadores/', views.computadores, name='computadores'),
    
    # AMD
    path('computadores/amd/', views.computadorAmd, name='computadorAmd'),
    path('computadores/amd/ryzen9-5900x/', views.ryzen9_5900x, name='ryzen9_5900x'),
    path('computadores/amd/ryzen7-8700f/', views.ryzen7_8700f, name='ryzen7_8700f'),
    path('computadores/amd/ryzen7-5800x/', views.ryzen7_5800x, name='ryzen7_5800x'),

    # Intel
    path('computadores/intel/', views.computadorIntel, name='computadorIntel'),
    path('computadores/intel/core-i5-14400f/', views.coreI5_14400f, name='coreI5_14400f'),
    path('computadores/intel/core-i5-12400f/', views.coreI5_12400f, name='coreI5_12400f'),

    # -------------------- PORTÁTEIS -------------------- #
    path('portateis/', views.portateis, name='portateis'),
    
    # Apple
    path('portateis/apple/', views.portatilApple, name='portatilApple'),
    path('portateis/apple/macbook-pro/', views.macbookPro, name='macbookPro'),
    path('portateis/apple/macbook-air/', views.macbookAir, name='macbookAir'),

    # Lenovo
    path('portateis/lenovo/', views.portatilLenovo, name='portatilLenovo'),
    path('portateis/lenovo/ideapad-slim5/', views.ideapadSlim5, name='ideapadSlim5'),

    # Samsung
    path('portateis/samsung/', views.portatilSamsung, name='portatilSamsung'),
    path('portateis/samsung/book5-pro-360/', views.book5Pro360, name='book5Pro360'),
    path('portateis/samsung/book4/', views.book4, name='book4'),
    path('portateis/samsung/book3-pro/', views.book3Pro, name='book3Pro'),

    # -------------------- TABLETS -------------------- #
    path('tablets/', views.tablets, name='tablets'),
    
    # Apple
    path('tablets/apple/', views.tabletApple, name='tabletApple'),
    path('tablets/apple/ipad-pro/', views.ipadPro, name='ipadPro'),
    path('tablets/apple/ipad-air/', views.ipadAir, name='ipadAir'),
    path('tablets/apple/ipad/', views.ipad, name='ipad'),

    # Samsung
    path('tablets/samsung/', views.tabletSamsung, name='tabletSamsung'),
    path('tablets/samsung/tab-s10-plus/', views.tabS10Plus, name='tabS10Plus'),
    path('tablets/samsung/tab-s10-fe/', views.tabS10Fe, name='tabS10Fe'),

    # Xiaomi
    path('tablets/xiaomi/', views.tabletXiaomi, name='tabletXiaomi'),
    path('tablets/xiaomi/redmi-pad2/', views.redmiPad2, name='redmiPad2'),

    # -------------------- CONSOLAS -------------------- #
    path('consolas/', views.consolas, name='consolas'),
    
    # Nintendo
    path('consolas/nintendo/', views.consolaNintendo, name='consolaNintendo'),
    path('consolas/nintendo/switch-2/', views.switch2, name='switch2'),
    path('consolas/nintendo/switch/', views.switch, name='switch'),

    # Sony
    path('consolas/sony/', views.consolaSony, name='consolaSony'),
    path('consolas/sony/ps5-pro/', views.playstation5pro, name='playstation5pro'),
    path('consolas/sony/ps5/', views.playstation5, name='playstation5'),

    # Xbox
    path('consolas/xbox/', views.consolaXbox, name='consolaXbox'),
    path('consolas/xbox/series-x/', views.xboxX, name='xboxX'),
    path('consolas/xbox/series-s/', views.xboxS, name='xboxS'),
]
