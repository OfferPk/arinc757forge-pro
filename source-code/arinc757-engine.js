/**
 * ARINC757Forge Pro — Core Engine
 * Solid-State Cockpit Voice & Flight Data Recorder System (CVFDR)
 * Standard References: ARINC Characteristic 757A, ARINC 717, ARINC 573, EUROCAE ED-112A, FAA TSO-C123b / TSO-C124b
 */

class ARINC757Engine {
  constructor() {
    // ARINC 717 Subframe Synchronization Barker Codes
    this.barkerSyncCodes = {
      1: 0x247, // 0010 0100 0111 (Subframe 1)
      2: 0x5B8, // 0101 1011 1000 (Subframe 2)
      3: 0xA47, // 1010 0100 0111 (Subframe 3)
      4: 0xDB8  // 1101 1011 1000 (Subframe 4)
    };

    this.sampleRateWordsPerSec = 256; // Standard 256 words/sec (also supports 512, 1024)
    this.currentSubframe = 1;
    this.elapsedRecordingHours = 14.8; // Up to 25.0 hours mandatory (ED-112A)
    this.syncLocked = true;

    // Active Simulated Flight Parameters (ARINC 717 Frame Words)
    this.telemetry = {
      pitchDeg: 2.4,             // Word 3: -90 to +90 deg
      rollDeg: -1.2,             // Word 4: -180 to +180 deg
      headingDeg: 284.5,         // Word 5: 0 to 360 deg
      airspeedKt: 298.0,         // Word 6: 0 to 500 kts (CAS)
      altitudeFt: 35000,         // Word 7: -1000 to 50000 ft (PA)
      normalAccelG: 1.02,        // Word 8: -3.0 to +6.0 G
      longAccelG: 0.04,          // Word 9: -1.0 to +1.0 G
      engine1N1Pct: 88.4,        // Word 10: 0 to 120%
      engine2N1Pct: 88.5,        // Word 11: 0 to 120%
      controlColumnDeg: 1.5,     // Word 12: Elevator (-20 to +20 deg)
      controlWheelDeg: -0.8,     // Word 13: Aileron (-30 to +30 deg)
      rudderPedalDeg: 0.0,       // Word 14: Rudder (-30 to +30 deg)
      masterWarning: false,      // Word 15 bit 0
      masterCaution: false       // Word 15 bit 1
    };

    // 4-Channel CVR Audio Channels (ARINC 757A §4.2)
    this.audioChannels = {
      CH1: { name: 'Pilot Flying (First Officer Headset)', gainDb: 0.0, rmsLevelDb: -18.2, status: 'RECORDING' },
      CH2: { name: 'Pilot Monitoring (Captain Headset)', gainDb: 0.0, rmsLevelDb: -16.5, status: 'RECORDING' },
      CH3: { name: 'Cockpit Area Microphone (CAM Ambient)', gainDb: +3.0, rmsLevelDb: -22.1, status: 'RECORDING' },
      CH4: { name: 'Flight Deck PA / Observer Headset', gainDb: 0.0, rmsLevelDb: -34.0, status: 'STANDBY' }
    };

    // Underwater Locator Beacon (ULB) Telemetry (TSO-C121b / ED-112A)
    this.ulb = {
      frequencyKhz: 37.5,
      pulseLengthMs: 10.0,
      pulseRepetitionHz: 1.0,
      batteryRemainingDays: 88.5, // 90 days required
      depthRatingMeters: 6000,
      activePinging: true
    };

    // Crash Survivable Memory Unit (CSMU)
    this.csmu = {
      status: 'HEALTHY',
      flashWearPct: 4.2,
      reedSolomonErrorsCorrected: 0,
      impactSensorTripped: false,
      fireHardenedFlashSizeMB: 16384 // 16 GB solid state
    };

    // Frame Buffer
    this.subframeHistory = [];
    this.generateSubframeData();

    // Statistics
    this.stats = {
      framesCaptured: 0,
      syncLossEvents: 0,
      ulbPulsesFired: 0
    };
  }

  generateSubframeData() {
    const syncWord = this.barkerSyncCodes[this.currentSubframe];
    const subframe = {
      subframeNumber: this.currentSubframe,
      syncWordHex: '0x' + syncWord.toString(16).toUpperCase().padStart(3, '0'),
      words: new Array(this.sampleRateWordsPerSec).fill(0),
      timestamp: new Date().toISOString()
    };

    // Encode ARINC 717 12-bit words
    subframe.words[0] = syncWord; // Word 1: Barker Code
    subframe.words[1] = Math.round(this.elapsedRecordingHours * 10) & 0xFFF; // Word 2: Time
    subframe.words[2] = this.encode12BitSigned(this.telemetry.pitchDeg, -90, 90); // Word 3
    subframe.words[3] = this.encode12BitSigned(this.telemetry.rollDeg, -180, 180); // Word 4
    subframe.words[4] = Math.round((this.telemetry.headingDeg / 360) * 4095) & 0xFFF; // Word 5
    subframe.words[5] = Math.round((this.telemetry.airspeedKt / 512) * 4095) & 0xFFF; // Word 6
    subframe.words[6] = Math.round(((this.telemetry.altitudeFt + 1000) / 60000) * 4095) & 0xFFF; // Word 7
    subframe.words[7] = this.encode12BitSigned(this.telemetry.normalAccelG, -3.0, 6.0); // Word 8
    subframe.words[8] = this.encode12BitSigned(this.telemetry.longAccelG, -1.0, 1.0); // Word 9
    subframe.words[9] = Math.round((this.telemetry.engine1N1Pct / 120) * 4095) & 0xFFF; // Word 10
    subframe.words[10] = Math.round((this.telemetry.engine2N1Pct / 120) * 4095) & 0xFFF; // Word 11
    subframe.words[11] = this.encode12BitSigned(this.telemetry.controlColumnDeg, -20, 20); // Word 12
    subframe.words[12] = this.encode12BitSigned(this.telemetry.controlWheelDeg, -30, 30); // Word 13
    subframe.words[13] = this.encode12BitSigned(this.telemetry.rudderPedalDeg, -30, 30); // Word 14
    subframe.words[14] = ((this.telemetry.masterWarning ? 1 : 0) << 0) | ((this.telemetry.masterCaution ? 1 : 0) << 1); // Word 15

    this.subframeHistory.unshift(subframe);
    if (this.subframeHistory.length > 20) this.subframeHistory.pop();
    this.stats.framesCaptured++;
    return subframe;
  }

  encode12BitSigned(val, minVal, maxVal) {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const normalized = (clamped - minVal) / (maxVal - minVal);
    return Math.round(normalized * 4095) & 0xFFF;
  }

  stepSubframe() {
    this.currentSubframe = (this.currentSubframe % 4) + 1;
    if (this.currentSubframe === 1) {
      this.elapsedRecordingHours += (4 / 3600); // 4 seconds per major frame
      this.stats.ulbPulsesFired++;
    }
    return this.generateSubframeData();
  }

  triggerImpactSensor() {
    this.csmu.impactSensorTripped = true;
    this.telemetry.normalAccelG = 14.8; // Peak G recorded
    this.ulb.activePinging = true;
    this.generateSubframeData();
    return { status: 'CRASH_IMPACT_RECORDED', gForce: 14.8, csmulocked: true };
  }

  generateARINC429BusWords() {
    // ARINC 429 Label 301 (Octal): CVFDR BITE & Health Status
    const label301 = 0xC1; // Label 301 representation
    let data301 = 0;

    const syncBit = this.syncLocked ? 1 : 0;
    const csmuOkBit = this.csmu.status === 'HEALTHY' ? 1 : 0;
    const impactBit = this.csmu.impactSensorTripped ? 1 : 0;
    const ulbOkBit = this.ulb.activePinging ? 1 : 0;

    data301 |= (syncBit & 0x01) << 10; // Bit 11: Sync Lock
    data301 |= (csmuOkBit & 0x01) << 11; // Bit 12: CSMU Flash Integrity
    data301 |= (impactBit & 0x01) << 12; // Bit 13: Impact Sensor Tripped
    data301 |= (ulbOkBit & 0x01) << 13; // Bit 14: ULB Ping Verified
    data301 |= (this.currentSubframe & 0x07) << 14; // Bits 15-17 Subframe (1-4)
    data301 |= 0x03 << 28; // Bits 29-30 SSM (Normal Operation)

    let word301 = (data301 & 0x7FFFFF00) | (label301 & 0xFF);
    word301 = this.applyOddParity(word301);

    // Label 302 (Octal): Elapsed Recording Duration & Word Rate
    const label302 = 0xC2;
    let data302 = 0;
    const elapsedHrsInt = Math.min(255, Math.round(this.elapsedRecordingHours * 10)); // Tenths of hours

    data302 |= (elapsedHrsInt & 0xFF) << 10; // Bits 11-18 Elapsed Hours
    data302 |= ((this.sampleRateWordsPerSec === 256 ? 1 : 2) & 0x07) << 18; // Bits 19-21 Rate Code
    data302 |= 0x03 << 28; // Bits 29-30 SSM

    let word302 = (data302 & 0x7FFFFF00) | (label302 & 0xFF);
    word302 = this.applyOddParity(word302);

    return {
      label301: { hex: '0x' + (word301 >>> 0).toString(16).toUpperCase().padStart(8, '0'), parityValid: this.verifyOddParity(word301) },
      label302: { hex: '0x' + (word302 >>> 0).toString(16).toUpperCase().padStart(8, '0'), parityValid: this.verifyOddParity(word302) }
    };
  }

  applyOddParity(word32) {
    let bits = word32 & 0x7FFFFFFF;
    let count = 0;
    for (let i = 0; i < 31; i++) {
      if ((bits >> i) & 1) count++;
    }
    if (count % 2 === 0) {
      bits |= (1 << 31);
    }
    return bits >>> 0;
  }

  verifyOddParity(word32) {
    let count = 0;
    for (let i = 0; i < 32; i++) {
      if ((word32 >>> i) & 1) count++;
    }
    return count % 2 === 1;
  }

  getRecorderSummary() {
    return {
      currentSubframe: this.currentSubframe,
      elapsedRecordingHours: parseFloat(this.elapsedRecordingHours.toFixed(2)),
      telemetry: { ...this.telemetry },
      audioChannels: { ...this.audioChannels },
      ulb: { ...this.ulb },
      csmu: { ...this.csmu },
      stats: { ...this.stats },
      busWords: this.generateARINC429BusWords()
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ARINC757Engine };
}
