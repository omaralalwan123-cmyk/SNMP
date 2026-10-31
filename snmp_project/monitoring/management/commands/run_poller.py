import time

from django.core.management.base import BaseCommand

from monitoring.models import Device
from monitoring.snmp_utils import poll_device_snmp


class Command(BaseCommand):
    help = "Poll all devices over SNMP every N seconds (alternative to Celery beat, no Redis needed)."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=int, default=60, help='Polling interval in seconds (default 60)')
        parser.add_argument('--once', action='store_true', help='Run a single polling cycle and exit')

    def handle(self, *args, interval, once, **options):
        while True:
            started = time.monotonic()
            for device in Device.objects.all():
                metric = poll_device_snmp(device)
                cpu = '-' if metric.cpu_usage is None else f"{metric.cpu_usage}%"
                self.stdout.write(f"[POLL] {device.ip_address}: CPU={cpu} interface={metric.interface_status}")
            if once:
                return
            time.sleep(max(0, interval - (time.monotonic() - started)))
