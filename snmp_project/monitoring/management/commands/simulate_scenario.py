import random

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

    def handle(self, *args, scenario, device, count, **options):
        lookup = {'pk': device} if device.isdigit() else {'ip_address': device}
        try:
            dev = Device.objects.get(**lookup)
        except Device.DoesNotExist:
            raise CommandError(f"Device {device} not found")
        for _ in range(count):
            metric = record_poll_result(dev, SCENARIOS[scenario]())
            self.stdout.write(f"[SIM] {dev.ip_address}: CPU={metric.cpu_usage} interface={metric.interface_status}")
