from io import StringIO
from unittest.mock import patch

from django.core.management import call_command, CommandError
from django.test import TestCase

from .models import Device, Metric


class SimulateScenarioCommandTests(TestCase):
    def setUp(self):
        self.device = Device.objects.create(ip_address='192.0.2.1')

    @patch('monitoring.management.commands.simulate_scenario.time.sleep', side_effect=KeyboardInterrupt)
    def test_continuous_mode_records_samples_until_interrupted(self, _sleep):
        call_command(
            'simulate_scenario',
            'normal',
            '--device',
            str(self.device.pk),
            '--continuous',
            stdout=StringIO(),
        )

        metric = Metric.objects.get(device=self.device)
        self.assertGreaterEqual(metric.cpu_usage, 10)
        self.assertLessEqual(metric.cpu_usage, 45)

    def test_continuous_mode_rejects_non_positive_interval(self):
        with self.assertRaises(CommandError):
            call_command(
                'simulate_scenario',
                'normal',
                '--device',
                str(self.device.pk),
                '--continuous',
                '--interval',
                '0',
                stdout=StringIO(),
            )

    @patch('monitoring.management.commands.simulate_scenario.time.sleep', side_effect=KeyboardInterrupt)
    def test_continuous_all_mode_records_samples_for_every_device(self, _sleep):
        second_device = Device.objects.create(ip_address='192.0.2.2')
        call_command(
            'simulate_scenario',
            'normal',
            '--device',
            'all',
            '--continuous',
            stdout=StringIO(),
        )

        self.assertEqual(Metric.objects.filter(device__in=[self.device, second_device]).count(), 2)

    def test_continuous_all_mode_includes_devices_added_while_running(self):
        second_device = None
        sleep_calls = 0

        def add_device_between_samples(_interval):
            nonlocal second_device, sleep_calls
            sleep_calls += 1
            if sleep_calls == 1:
                second_device = Device.objects.create(ip_address='192.0.2.3')
            else:
                raise KeyboardInterrupt

        with patch(
            'monitoring.management.commands.simulate_scenario.time.sleep',
            side_effect=add_device_between_samples,
        ):
            call_command(
                'simulate_scenario',
                'normal',
                '--device',
                'all',
                '--continuous',
                stdout=StringIO(),
            )

        self.assertIsNotNone(second_device)
        self.assertTrue(Metric.objects.filter(device=second_device).exists())
