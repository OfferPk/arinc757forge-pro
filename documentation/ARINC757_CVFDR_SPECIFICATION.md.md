# ARINC Characteristic 757A Solid-State Cockpit Voice & Flight Data Recorder Specification

**Document ID**: ARINC757-SPEC-2026-v1.0  
**Normative Standards**: ARINC Characteristic 757A, ARINC 717, ARINC 573, EUROCAE ED-112A, FAA TSO-C123b, FAA TSO-C124b, ICAO Annex 6  
**Classification**: Commercial Avionics Crash-Protected Flight Safety Recording Standard

---

## 1\. Executive Summary & Operational Scope

The **ARINC Characteristic 757A (Solid-State Cockpit Voice and Flight Data Recorder \- CVFDR)** standardizes the combination flight data and audio recording system mandatory on all commercial transport category aircraft.

In modern air crash investigation and airline flight operational quality assurance (FOQA), ARINC 757A governs:

1. Continuous digital telemetry ingestion from the Flight Data Acquisition Unit (FDAU) via ARINC 717 / 573 bitstreams.  
2. 4-channel independent cockpit audio recording (Pilot Flying, Pilot Monitoring, Cockpit Area Microphone, PA).  
3. 25-hour solid-state flight data retention in the Crash Survivable Memory Unit (CSMU).  
4. Underwater Locator Beacon (ULB) acoustic signal transmission (37.5 kHz).  
5. High-integrity cockpit health reporting via ARINC 429 digital bus words.

---

## 2\. ARINC 717 Subframe Structure & Barker Synchronization

The telemetry engine de-multiplexes ARINC 717 12-bit binary words sampled at 256, 512, or 1024 words per second. Major frames consist of 4 distinct 1-second subframes synchronized by mandatory Barker codes:

- **Subframe 1 Word 1**: `0x247` (`0010 0100 0111`)  
- **Subframe 2 Word 1**: `0x5B8` (`0101 1011 1000`)  
- **Subframe 3 Word 1**: `0xA47` (`1010 0100 0111`)  
- **Subframe 4 Word 1**: `0xDB8` (`1101 1011 1000`)

Mandatory crash investigation flight dynamics include Pitch, Roll, Heading, Computed Airspeed (CAS), Pressure Altitude, Normal Acceleration (\$N\_z\$), Longitudinal Acceleration (\$N\_x\$), Engine N1/N2/EPR, Control Column/Wheel/Rudder positions, and discrete master warning states.

---

## 3\. Four-Channel Cockpit Voice Recorder (CVR) Audio

Compliant with FAA TSO-C123b and EUROCAE ED-112A, the CVR subsystem records four independent audio streams:

- **Channel 1**: Pilot Flying headset audio (Co-pilot / First Officer).  
- **Channel 2**: Pilot Monitoring headset audio (Captain).  
- **Channel 3**: Cockpit Area Microphone (CAM) omnidirectional acoustic channel with frequency spectrum analysis for engine rotor harmonic frequency extraction.  
- **Channel 4**: Third crew member / observer headset or flight deck Public Address (PA).

---

## 4\. Crash Survivable Memory Unit (CSMU) & ULB Beacon

The solid-state flash memory module is enclosed in a bright orange crash-protected titanium/stainless steel cylinder tested to EUROCAE ED-112A:

- **Impact Shock**: 3,400 G for 6.5 milliseconds.  
- **Penetration Resistance**: 500 lb steel pin dropped from 10 feet.  
- **High-Temperature Fire**: 1,100°C for 60 minutes.  
- **Deep-Sea Hydrostatic Pressure**: 8,700 psi (6,000 meters / 20,000 feet).  
- **Underwater Locator Beacon (ULB)**: 37.5 kHz ± 1 kHz acoustic pulse, 10 ms pulse duration, 1.0 Hz repetition rate, with 90-day minimum operating battery reserve (TSO-C121b).

---

## 5\. ARINC 429 Glass-Cockpit Discrete Bus Output

The CVFDR LRU broadcasts status onto the low-speed aircraft ARINC 429 bus:

- **Label 301 (Octal)**: CVFDR BITE & Health Status  
  - Bit 11: ARINC 717 Subframe Synchronization Lock (1: Locked)  
  - Bit 12: CSMU Solid-State Flash Integrity (1: Healthy)  
  - Bit 13: Impact Sensor Tripped State (1: Crash Triggered)  
  - Bit 14: ULB Acoustic Beacon Verified (1: Operational)  
  - Bits 15-17: Active Subframe Index (1-4)  
  - Bits 29-30: SSM (Normal Operation: 11b)  
  - Bit 32: Odd Parity  
- **Label 302 (Octal)**: Elapsed Recording Duration & Word Rate  
  - Bits 11-18: Elapsed Flight Recording Hours (in tenths of an hour, 0 \- 25.5 hrs)  
  - Bits 19-21: Sampling Word Rate Code (1: 256 wps, 2: 512 wps, 3: 1024 wps)  
  - Bits 29-30: SSM  
  - Bit 32: Odd Parity