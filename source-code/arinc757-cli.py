#!/usr/bin/env python3
"""
ARINC757Forge Pro — Standalone Python 3 CLI Runner & ARINC 717 Frame Parser
Solid-State Cockpit Voice & Flight Data Recorder (CVFDR) Suite
Standards: ARINC Characteristic 757A, ARINC 717, EUROCAE ED-112A
"""

import sys
import json
import time

class ARINC757Simulator:
    def __init__(self):
        self.barker_codes = {1: 0x247, 2: 0x5B8, 3: 0xA47, 4: 0xDB8}
        self.subframe = 1
        self.words_per_sec = 256
        self.elapsed_hours = 14.8
        self.sync_locked = True
        
        self.telemetry = {
            "pitch": 2.4,
            "roll": -1.2,
            "heading": 284.5,
            "cas": 298.0,
            "alt": 35000,
            "nz": 1.02,
            "n1_1": 88.4,
            "n1_2": 88.5
        }
        
        self.audio_channels = ["CH1_FO", "CH2_CAPT", "CH3_CAM", "CH4_PA"]
        self.ulb_active = True
        self.ulb_freq_khz = 37.5
        self.csmu_flash_gb = 16
        self.impact_tripped = False

    def build_subframe(self):
        sync = self.barker_codes[self.subframe]
        words = [0] * self.words_per_sec
        words[0] = sync
        words[1] = round(self.elapsed_hours * 10) & 0xFFF
        words[2] = round(((self.telemetry["pitch"] + 90) / 180) * 4095) & 0xFFF
        words[3] = round(((self.telemetry["roll"] + 180) / 360) * 4095) & 0xFFF
        words[4] = round((self.telemetry["heading"] / 360) * 4095) & 0xFFF
        words[5] = round((self.telemetry["cas"] / 512) * 4095) & 0xFFF
        words[6] = round(((self.telemetry["alt"] + 1000) / 60000) * 4095) & 0xFFF
        words[7] = round(((self.telemetry["nz"] + 3.0) / 9.0) * 4095) & 0xFFF
        return {
            "subframe": self.subframe,
            "barker_hex": hex(sync),
            "words": words[:8]
        }

    def step(self):
        self.subframe = (self.subframe % 4) + 1
        return self.build_subframe()

    def generate_arinc429_words(self):
        # Label 301 (Octal): CVFDR BITE Status
        label301 = 0xC1
        data301 = ((1 if self.sync_locked else 0) << 10) | \
                  (1 << 11) | \
                  ((1 if self.impact_tripped else 0) << 12) | \
                  ((1 if self.ulb_active else 0) << 13) | \
                  ((self.subframe & 0x07) << 14) | \
                  (0x03 << 28)
        word301 = (data301 & 0x7FFFFF00) | label301
        word301 = self.apply_odd_parity(word301)

        # Label 302 (Octal): Elapsed Hours & Word Rate
        label302 = 0xC2
        hrs_val = min(255, round(self.elapsed_hours * 10))
        data302 = ((hrs_val & 0xFF) << 10) | (1 << 18) | (0x03 << 28)
        word302 = (data302 & 0x7FFFFF00) | label302
        word302 = self.apply_odd_parity(word302)

        return {
            "label301": hex(word301),
            "label302": hex(word302),
            "odd_parity_valid": self.verify_odd_parity(word301) and self.verify_odd_parity(word302)
        }

    def apply_odd_parity(self, word):
        bits = word & 0x7FFFFFFF
        count = bin(bits).count('1')
        if count % 2 == 0:
            bits |= (1 << 31)
        return bits

    def verify_odd_parity(self, word):
        return bin(word).count('1') % 2 == 1

def run_cli():
    sim = ARINC757Simulator()
    print("=" * 70)
    print("ARINC757Forge Pro — Solid-State CVFDR Telemetry CLI")
    print("Standards: ARINC Characteristic 757A, ARINC 717, EUROCAE ED-112A")
    print("=" * 70)

    print(f"\n[CRASH SURVIVABLE MEMORY UNIT (CSMU): {sim.csmu_flash_gb} GB SOLID STATE]")
    print(f"  Underwater Locator Beacon (ULB) : {sim.ulb_freq_khz} kHz (Active Pinging)")
    print(f"  Audio Channels Active           : 4 Independent Channels (FO, CAPT, CAM, PA)")
    print(f"  Elapsed Recording Duration      : {sim.elapsed_hours:.1f} Hours (25-Hour Window)")

    for sf in range(1, 5):
        frame = sim.build_subframe()
        print(f"\n[ARINC 717 SUBFRAME {frame['subframe']} PARSED]")
        print(f"  Barker Sync Word : {frame['barker_hex']}")
        print(f"  Sampled Dynamics : Pitch={sim.telemetry['pitch']}° | Roll={sim.telemetry['roll']}° | HDG={sim.telemetry['heading']}°")
        print(f"  Air Data Metrics : CAS={sim.telemetry['cas']} kt | Alt={sim.telemetry['alt']} ft | Nz={sim.telemetry['nz']} G")
        sim.step()

    bus = sim.generate_arinc429_words()
    print("\n" + "-" * 70)
    print("ARINC 429 Glass-Cockpit Discrete Bus Output:")
    print(f"  Label 301 (CVFDR BITE & Health) : {bus['label301']}")
    print(f"  Label 302 (Elapsed Time & Rate) : {bus['label302']}")
    print(f"  Bit 32 Odd Parity Status        : {'VALID (PASS)' if bus['odd_parity_valid'] else 'INVALID (FAIL)'}")
    print("=" * 70)

if __name__ == "__main__":
    run_cli()
