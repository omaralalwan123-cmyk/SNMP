from celery import shared_task
from .models import Device
from .snmp_utils import poll_device_snmp

@shared_task
def poll_all_devices_task():
    # poll_device_snmp تتولى تخزين القياسات وتسجيل التنبيهات (بما فيها Timeout / Unreachable)
    for device in Device.objects.all():
        poll_device_snmp(device)
