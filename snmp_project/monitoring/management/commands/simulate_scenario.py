import random
import time

from django.core.management.base import BaseCommand, CommandError

from monitoring.models import Device
from monitoring.snmp_utils import record_poll_result

SCENARIOS = {
    'normal': lambda: {'success': True, 'cpu': round(random.uniform(10, 45), 2),
                       'down_interfaces': [], 'interfaces_up': 4, 'interfaces_total': 4},
    'high-cpu': lambda: {'success': True, 'cpu': round(random.uniform(80, 98), 2),
                         'down_interfaces': [], 'interfaces_up': 4, 'interfaces_total': 4},
    'interface-down': lambda: {'success': True, 'cpu': round(random.uniform(10, 45), 2),
                               'down_interfaces': ['2'], 'interfaces_up': 3, 'interfaces_total': 4},
    'unreachable': lambda: {'success': False, 'error': 'Timeout or network error: No SNMP response received before timeout'},
}


class Command(BaseCommand):
    help = ("Inject a simulated poll result for a device so the storage and alert pipeline "
            "can be demonstrated without real hardware.")

    def add_arguments(self, parser):
        parser.add_argument('scenario', choices=SCENARIOS.keys())
        parser.add_argument('--device', required=True, help='Device id or IP address')
        parser.add_argument('--count', type=int, default=1, help='Number of samples to record')
        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Keep recording simulated samples until interrupted with Ctrl+C',
        )
        parser.add_argument(
            '--interval',
            type=float,
            default=5,
            help='Seconds between samples in continuous mode (default: 5)',
        )

    def handle(self, *args, scenario, device, count, continuous, interval, **options):
        all_devices = device.lower() == 'all'
        if all_devices:
            devices = list(Device.objects.order_by('id'))
            if not devices:
                raise CommandError('No devices are available to simulate')
        else:
            lookup = {'pk': device} if device.isdigit() else {'ip_address': device}
            try:
                devices = [Device.objects.get(**lookup)]
            except Device.DoesNotExist:
                raise CommandError(f"Device {device} not found")

        if count < 1:
            raise CommandError('--count must be at least 1')
        if interval <= 0:
            raise CommandError('--interval must be greater than 0')

        try:
            while True:
                if all_devices:
                    devices = list(Device.objects.order_by('id'))
                    if not devices:
                        raise CommandError('No devices are available to simulate')
                for _ in range(1 if continuous else count):
                    for dev in devices:
                        metric = record_poll_result(dev, SCENARIOS[scenario]())
                        self.stdout.write(
                            f"[SIM] {dev.ip_address}: CPU={metric.cpu_usage} "
                            f"interface={metric.interface_status}"
                        )
                if not continuous:
                    break
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write('\nSimulation stopped.')
