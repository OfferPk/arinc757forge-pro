#!/usr/bin/env python3
"""
ARINC757Forge Pro — Automated Unit & Regression Test Suite
10 Comprehensive Verification Tests for ARINC 757A CVFDR Engine & ARINC 717 De-multiplexer
"""

import unittest
from arinc757_cli import ARINC757Simulator

class TestARINC757ForgePro(unittest.TestCase):
    def setUp(self):
        self.sim = ARINC757Simulator()

    def test_01_barker_code_synchronization(self):
        """Test 01: ARINC 717 Subframe Barker Code Synchronization"""
        expected = {1: 0x247, 2: 0x5B8, 3: 0xA47, 4: 0xDB8}
        self.assertEqual(self.sim.barker_codes, expected)
        frame1 = self.sim.build_subframe()
        self.assertEqual(frame1["words"][0], 0x247)

    def test_02_flight_dynamics_encoding(self):
        """Test 02: 12-Bit Flight Dynamics Normalization & Packing"""
        frame = self.sim.build_subframe()
        # Word 3: Pitch, Word 4: Roll, Word 5: Heading, Word 6: Airspeed
        for idx in range(2, 6):
            self.assertGreaterEqual(frame["words"][idx], 0)
            self.assertLessEqual(frame["words"][idx], 4095)

    def test_03_four_subframe_cycle(self):
        """Test 03: Cyclic Subframe Stepping (1 -> 2 -> 3 -> 4 -> 1)"""
        self.assertEqual(self.sim.subframe, 1)
        self.sim.step()
        self.assertEqual(self.sim.subframe, 2)
        self.sim.step()
        self.assertEqual(self.sim.subframe, 3)
        self.sim.step()
        self.assertEqual(self.sim.subframe, 4)
        self.sim.step()
        self.assertEqual(self.sim.subframe, 1)

    def test_04_twenty_five_hour_capacity(self):
        """Test 04: Solid-State CSMU Memory Retention Capacity (25-Hour Window)"""
        self.assertGreaterEqual(self.sim.csmu_flash_gb, 8)
        self.assertLessEqual(self.sim.elapsed_hours, 25.0)

    def test_05_four_audio_channels(self):
        """Test 05: Four Independent CVR Audio Channels Configuration"""
        expected = {"CH1_FO", "CH2_CAPT", "CH3_CAM", "CH4_PA"}
        self.assertEqual(set(self.sim.audio_channels), expected)

    def test_06_ulb_frequency_and_ping(self):
        """Test 06: Underwater Locator Beacon 37.5 kHz Telemetry"""
        self.assertEqual(self.sim.ulb_freq_khz, 37.5)
        self.assertTrue(self.sim.ulb_active)

    def test_07_impact_sensor_trigger(self):
        """Test 07: Crash Impact Accelerometer Sensor Trigger Event"""
        self.assertFalse(self.sim.impact_tripped)
        self.sim.impact_tripped = True
        words = self.sim.generate_arinc429_words()
        word301_int = int(words["label301"], 16)
        # Bit 13 should be set (1 << 12)
        self.assertTrue((word301_int >> 12) & 1)

    def test_08_arinc429_label301_parity(self):
        """Test 08: ARINC 429 Label 301 Bit 32 Odd Parity Verification"""
        words = self.sim.generate_arinc429_words()
        word301_int = int(words["label301"], 16)
        bit_count = bin(word301_int).count('1')
        self.assertEqual(bit_count % 2, 1, f"Label 301 parity must be odd (bits: {bit_count})")

    def test_09_arinc429_label302_parity(self):
        """Test 09: ARINC 429 Label 302 Bit 32 Odd Parity Verification"""
        words = self.sim.generate_arinc429_words()
        word302_int = int(words["label302"], 16)
        bit_count = bin(word302_int).count('1')
        self.assertEqual(bit_count % 2, 1, f"Label 302 parity must be odd (bits: {bit_count})")

    def test_10_altitude_scaling_bounds(self):
        """Test 10: Pressure Altitude Range Bounds (-1000 to +50000 ft)"""
        self.sim.telemetry["alt"] = 43000
        frame = self.sim.build_subframe()
        alt_word = frame["words"][6]
        self.assertGreater(alt_word, 2000)
        self.assertLessEqual(alt_word, 4095)

if __name__ == "__main__":
    unittest.main()
