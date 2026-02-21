from django.shortcuts import render

def homepage(request):
    return render(request, 'index.html')

#-------------------- LOGIN / REGISTER PAGE --------------------#
def loginPage(request):
    return render(request, 'loginPage.html')

def registerPage(request):
    return render(request, 'registerPage.html')

#-------------------- SMARTPHONES --------------------#
def smartphones(request):
    # Adicione "smartphones/" antes do nome do arquivo
    return render(request, 'smartphones/smartphones.html')

# Apple --------------------
def smartphoneApple(request):
    return render(request, 'smartphones/smartphone-apple.html')
def iphoneAir(request):
    return render(request, 'smartphones/iphone-air.html')
def iphone17Pro(request):
    return render(request, 'smartphones/iphone17Pro.html')
def iphone17(request):
    return render(request, 'smartphones/iphone17.html')
def iphone16(request):
    return render(request, 'smartphones/iphone16.html')
def iphone16e(request):
    return render(request, 'smartphones/iphone16e.html')

# Google --------------------
def smartphoneGoogle(request):
    return render(request, 'smartphones/smartphone-google.html')
def pixel10ProXL(request):
    return render(request, 'smartphones/pixel10-pro-xl.html')
def pixel10Pro(request):
    return render(request, 'smartphones/pixel10-pro.html')
def pixel10(request):
    return render(request, 'smartphones/pixel10.html')
# Samsung --------------------
def smartphoneSamsung(request):
    return render(request, 'smartphones/smartphone-samsung.html')
def s25Ultra(request):
    return render(request, 'smartphones/s25-ultra.html')
def s25Edge(request):
    return render(request, 'smartphones/s25-edge.html')
def s25(request):
    return render(request, 'smartphones/s25.html')
def zFold7(request):
    return render(request, 'smartphones/z-fold-7.html')
def zFlip7(request):
    return render(request, 'smartphones/z-flip-7.html')

# Xiaomi --------------------
def smartphoneXiaomi(request):
    return render(request, 'smartphones/smartphone-xiaomi.html')
def xiaomi15Ultra(request):
    return render(request, 'smartphones/xiaomi15-ultra.html')
def xiaomi15(request):
    return render(request, 'smartphones/xiaomi15.html')
def xiaomi15tPro(request):
    return render(request, 'smartphones/xiaomi15t-pro.html')
def xiaomi15t(request):
    return render(request, 'smartphones/xiaomi15t.html')
def redmiNote15ProPlus(request):
    return render(request, 'smartphones/redmi-note15-pro-plus.html')


#-------------------- COMPUTADORES --------------------#
def computadores(request):
    return render(request, 'computadores/computadores.html')

# Amd --------------------
def computadorAmd(request):
    return render(request, 'computadores/computador-amd.html')
def ryzen9_5900x(request):
    return render(request, 'computadores/ryzen9-5900x.html')
def ryzen7_8700f(request):
    return render(request, 'computadores/ryzen7-8700f.html')
def ryzen7_5800x(request):
    return render(request, 'computadores/ryzen7-5800x.html')

# Intel --------------------
def computadorIntel(request):
    return render(request, 'computadores/computador-intel.html')
def coreI5_14400f(request):
    return render(request, 'computadores/core-i5-14400f.html')
def coreI5_12400f(request):
    return render(request, 'computadores/core-i5-12400f.html')


#-------------------- PORTÁTEIS --------------------#
def portateis(request):
    return render(request, 'portateis/portateis.html')

# Apple --------------------
def portatilApple(request):
    return render(request, 'portateis/portatil-apple.html')
def macbookPro(request):
    return render(request, 'portateis/macbook-pro.html')
def macbookAir(request):
    return render(request, 'portateis/macbook-air.html')

# Lenovo --------------------
def portatilLenovo(request):
    return render(request, 'portateis/portatil-lenovo.html')
def ideapadSlim5(request):
    return render(request, 'portateis/ideapad-slim5.html')

# Samsung --------------------
def portatilSamsung(request):
    return render(request, 'portateis/portatil-samsung.html')
def book5Pro360(request):
    return render(request, 'portateis/book5Pro-360.html')
def book4(request):
    return render(request, 'portateis/book4.html')
def book3Pro(request):
    return render(request, 'portateis/book3Pro.html')


#-------------------- TABLETS --------------------#
def tablets(request):
    return render(request, 'tablets/tablets.html')

# Apple --------------------
def tabletApple(request):
    return render(request, 'tablets/tablet-apple.html')
def ipadPro(request):
    return render(request, 'tablets/ipad-pro.html')
def ipadAir(request):
    return render(request, 'tablets/ipad-air.html')
def ipad(request):
    return render(request, 'tablets/ipad.html')

# Samsung --------------------
def tabletSamsung(request):
    return render(request, 'tablets/tablet-samsung.html')
def tabS10Plus(request):
    return render(request, 'tablets/tab-s10-plus.html')
def tabS10Fe(request):
    return render(request, 'tablets/tab-s10-fe.html')

# Xiaomi --------------------
def tabletXiaomi(request):
    return render(request, 'tablets/tablet-xiaomi.html')
def redmiPad2(request):
    return render(request, 'tablets/redmi-pad2.html')


#-------------------- CONSOLAS --------------------#
def consolas(request):
    return render(request, 'consolas/consolas.html')

# Nintendo --------------------
def consolaNintendo(request):
    return render(request, 'consolas/consola-nintendo.html')
def switch2(request):
    return render(request, 'consolas/switch2.html')
def switch(request):
    return render(request, 'consolas/switch.html')

# Sony --------------------
def consolaSony(request):
    return render(request, 'consolas/consola-sony.html')
def playstation5pro(request):
    return render(request, 'consolas/playstation5pro.html')
def playstation5(request):
    return render(request, 'consolas/playstation5.html')

# Xbox --------------------
def consolaXbox(request):
    return render(request, 'consolas/consola-xbox.html')
def xboxX(request):
    return render(request, 'consolas/xbox-x.html')
def xboxS(request):
    return render(request, 'consolas/xbox-s.html')