#include <WiFi.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <esp_task_wdt.h>   // Watchdog
#include <time.h>           // NTP Time

// ─── WiFi ───
const char* ssid     = "Samreang 2.4G";
const char* password = "12345678";

// ─── Google Script ───
String serverName = "https://script.google.com/macros/s/AKfycbwBsN_aQZzjR1vogpiTT7hsdou4k0ped-muVMjMpB0EecsQU52SRHnmufjI2j-jXWCq/exec";

// ─── PZEM ───
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);

// ─── ตัวแปรสะสม ───
float sumVoltage = 0, sumCurrent = 0, sumPower = 0;
float sumEnergy  = 0, sumFreq   = 0, sumPF   = 0;
int   count      = 0;
int   errorCount = 0;  // นับ error ต่อเนื่อง

// ─── สถิติ uptime ───
unsigned long totalSent   = 0;
unsigned long totalFailed = 0;

// ════════════════════════════════════════
void printSeparator() {
  Serial.println("========================================");
}

// ─── แสดงเวลาจริงจาก NTP ───
String getTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "ไม่มีเวลา";
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buf);
}

// ─── แสดง RAM ที่เหลือ ───
void printHeap() {
  Serial.printf("[MEM] Free Heap: %d bytes\n", ESP.getFreeHeap());
}

// ─── เชื่อม WiFi ───
void connectWiFi() {
  printSeparator();
  Serial.println("[WiFi] กำลังเชื่อมต่อ...");
  Serial.printf("[WiFi] SSID: %s\n", ssid);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(200);
  WiFi.begin(ssid, password);

  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 40) {
    esp_task_wdt_reset(); // ป้องกัน Watchdog kick ระหว่างรอ
    delay(500);
    Serial.printf("[WiFi] รอ... (%d/40)\n", ++timeout);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] ✅ เชื่อมต่อสำเร็จ!");
    Serial.printf("[WiFi] IP   : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WiFi] RSSI : %d dBm\n", WiFi.RSSI());

    // ตั้ง NTP เวลาไทย (UTC+7)
    configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com");
    Serial.println("[NTP] ซิงก์เวลาแล้ว");
  } else {
    Serial.println("[WiFi] ❌ เชื่อมไม่ได้ กำลัง Restart...");
    delay(1000);
    ESP.restart();
  }
  printSeparator();
}

// ════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);

  printSeparator();
  Serial.println("  ESP32 PZEM → Google Sheets (24hr Mode)");
  printSeparator();

  // ─── เปิด Watchdog 30 วินาที (core 3.x) ───
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms    = 30000,
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);
  Serial.println("[WDT] Watchdog Timer 30s เปิดแล้ว");

  Serial2.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  Serial.println("[PZEM] Serial2 พร้อม");

  connectWiFi();

  Serial.println("[SYSTEM] เริ่มรอบการอ่านค่า...");
  printSeparator();
}

// ════════════════════════════════════════
void loop() {
  esp_task_wdt_reset(); // ตีสุนัขยาม → ป้องกัน restart โดยไม่ตั้งใจ

  // ─── อ่านค่า PZEM ───
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power   = pzem.power();
  float energy  = pzem.energy();
  float freq    = pzem.frequency();
  float pf      = pzem.pf();

  if (!isnan(voltage) && !isnan(current) &&
      voltage > 0 && voltage < 300 &&   // ตรวจสอบค่าสมเหตุสมผล
      current >= 0 && current < 100) {

    sumVoltage += voltage;
    sumCurrent += current;
    sumPower   += power;
    sumEnergy  += energy;
    sumFreq    += freq;
    sumPF      += pf;
    count++;
    errorCount = 0; // reset error streak

    Serial.printf("[%02d/60] %s | V:%.1fV I:%.3fA P:%.1fW F:%.1fHz PF:%.2f\n",
      count, getTime().c_str(), voltage, current, power, freq, pf);

  } else {
    errorCount++;
    Serial.printf("[ERROR] อ่านค่าไม่ได้ (%d ครั้งติดกัน) เวลา: %s\n",
      errorCount, getTime().c_str());

    // ─── ถ้า error ติดกัน 30 ครั้ง = PZEM มีปัญหา restart ───
    if (errorCount >= 30) {
      Serial.println("[ERROR] PZEM error นานเกินไป กำลัง Restart...");
      delay(1000);
      ESP.restart();
    }
  }

  // ─── ส่งข้อมูลเมื่อครบ 60 วิ ───
  if (count >= 60) {
    float avgVoltage = sumVoltage / count;
    float avgCurrent = sumCurrent / count;
    float avgPower   = sumPower   / count;
    float avgEnergy  = sumEnergy  / count;
    float avgFreq    = sumFreq    / count;
    float avgPF      = sumPF      / count;

    printSeparator();
    Serial.printf("[AVG] เวลา: %s\n", getTime().c_str());
    Serial.printf("  Voltage   : %.2f V\n",   avgVoltage);
    Serial.printf("  Current   : %.3f A\n",   avgCurrent);
    Serial.printf("  Power     : %.2f W\n",   avgPower);
    Serial.printf("  Energy    : %.4f kWh\n", avgEnergy);
    Serial.printf("  Frequency : %.2f Hz\n",  avgFreq);
    Serial.printf("  PF        : %.3f\n",     avgPF);
    printHeap();

    // ─── เช็ค WiFi ก่อนส่ง ───
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] หลุด กำลังเชื่อมใหม่...");
      connectWiFi();
    }

    // ─── ส่ง HTTP ───
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("[HTTP] กำลังส่งข้อมูล...");

      HTTPClient http;
      http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
      http.setTimeout(10000); // timeout 10 วิ ป้องกันค้าง

      String url = serverName +
        "&voltage="   + String(avgVoltage, 2) +
        "&current="   + String(avgCurrent, 3) +
        "&power="     + String(avgPower,   2) +
        "&energy="    + String(avgEnergy,  4) +
        "&frequency=" + String(avgFreq,    2) +
        "&pf="        + String(avgPF,      3);

      http.begin(url);
      int code = http.GET();

      if (code > 0) {
        totalSent++;
        Serial.printf("[HTTP] ✅ สำเร็จ! Code:%d | ส่งทั้งหมด:%lu ครั้ง\n",
          code, totalSent);
      } else {
        totalFailed++;
        Serial.printf("[HTTP] ❌ ล้มเหลว! Error:%s | ล้มเหลว:%lu ครั้ง\n",
          http.errorToString(code).c_str(), totalFailed);
      }

      http.end();

    } else {
      Serial.println("[HTTP] ❌ ไม่มี WiFi ข้ามการส่ง");
      totalFailed++;
    }

    // ─── รีเซ็ต ───
    sumVoltage = sumCurrent = sumPower = sumEnergy = sumFreq = sumPF = 0;
    count = 0;

    printSeparator();
    Serial.printf("[SYSTEM] Uptime: %lu วินาที | ส่งสำเร็จ:%lu | ล้มเหลว:%lu\n",
      millis() / 1000, totalSent, totalFailed);
    printSeparator();
  }

  delay(1000);
}